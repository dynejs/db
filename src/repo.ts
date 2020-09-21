import uuid = require('uuid')
import Knex = require('knex')
import { Connection } from './connection'
import { Constructable, resolve } from '@dynejs/core'
import { FieldMetadataArgs, RelationMetadataArgs, metadataStorage } from './metadata/metadata-storage'
import { sync } from './sync'
import { Relation } from './relation'

export type AttributeKeys<T, K extends keyof T> = Pick<T, K> | T

export interface DBRow {
    [key: string]: string
}

export class Repo<T> {

    /**
     * Knex instance
     */
    db: Knex

    /**
     * Table name used for queries
     */
    table: string

    /**
     * Internal Knex query
     */
    private _query: Knex.QueryBuilder

    /**
     * Relations to load in the current query
     * its optionally set by query or on model metadata
     */
    private _with: string[]

    /**
     * Relations metadata on the for the current repo
     */
    relations: RelationMetadataArgs[]

    /**
     * Model fields metadata
     */
    fields: FieldMetadataArgs[]

    /**
     * Model used for building query
     */
    model: Constructable<any>

    constructor(model: Constructable<T>) {
        if (!model) {
            throw new Error('No model in initialization of repo')
        }
        this.model = model
        this.setup()
    }

    /**
     * Initial setup based on model decorators
     */
    setup() {
        this.db = resolve(Connection).active()
        this.relations = metadataStorage.getRelations(this.model.name)
        this.fields = metadataStorage.getFields(this.model.name)

        const modelDescription = metadataStorage.getModelMeta(this.model.name)
        this.table = modelDescription.table
        this._with = modelDescription.with || null

        this.reset()
    }

    /**
     * Resets the query
     * Queries are reseted after read/write operations
     */
    reset() {
        this._query = this.db(this.table)
    }

    /**
     * Used internally but public for make queries on related repos
     */
    async rawGet(): Promise<T[]> {
        let result = await this._query

        const relations = this.relations.filter(relation => {
            return this._with
                ? this._with.indexOf(relation.as) > -1
                : true
        })

        for (const relation of relations) {
            await (new Relation(result, relation)).build()
        }

        return result
    }

    /**
     * Formats the result based on fields metadata
     *
     * @param result
     */
    format(result: T[] | T): any {
        if (!result) {
            return null
        }

        const fields = metadataStorage.getFields(this.model.name)

        const formatFields = (item: T) => {
            // Creating a new model
            const model = new this.model()

            // Set model properties
            const formattedModel = fields.reduce((acc, field) => {
                acc[field.name] = this.cast(field.name, item[field.name])
                return acc
            }, model)

            // Run a format, to make additional changes on model
            if (typeof model.format === 'function') {
                model.format()
            }

            return formattedModel
        }

        if (!Array.isArray(result)) {
            return formatFields(result)
        }

        return result.map(r => formatFields(r))
    }

    /**
     * Create a query with the model parameters
     * and formats the output
     */
    async get<A extends keyof T>(attributes?: AttributeKeys<T, A>): Promise<T[]> {
        this.buildWhere(attributes)

        let result = await this.rawGet()

        this.reset()

        return this.format(result)
    }

    /**
     * Retreive only one result from the query result
     */
    async find<A extends keyof T>(attributes?: AttributeKeys<T, A>): Promise<T> {
        this.buildWhere(attributes)
        const res = await this.get()
        return res.shift()
    }

    /**
     * Runs a new insert query with the given attributes
     *
     * @param attributes
     */
    async create<A extends keyof T>(attributes: AttributeKeys<T, A>): Promise<string> {
        const model = new this.model()

        const data = Object.assign(model, {
            id: this.getPrimaryKey(),
            ...attributes,
            created_at: new Date(),
            updated_at: new Date()
        })

        if (typeof model.transform === 'function') {
            await model.transform()
        }

        await this._query.insert(data)
        return data.id
    }

    /**
     * Updates a record with the given attributes
     *
     * @param attributes
     */
    async update<A extends keyof T>(attributes: AttributeKeys<T, A>): Promise<boolean> {
        const model = new this.model()

        const data = Object.assign(model, {
            ...attributes,
            updated_at: new Date()
        })

        if (typeof model.transform === 'function') {
            await model.transform()
        }

        const updated = await this._query.update(data)

        return updated !== 0
    }

    /**
     * Deletes a record with the current query
     */
    async destroy<A extends keyof T>(attributes?: AttributeKeys<T, A>): Promise<boolean> {
        this.buildWhere(attributes)
        const deleted = await this._query.delete()
        return deleted !== 0
    }

    /**
     * Paginates the result set
     *
     * @param size
     * @param offset
     */
    async paginate(size = 30, offset: number | string = 0) {
        offset = Number(offset)
        const query = this._query
        const paged = await query.clone()

        query.limit(size).offset(offset * size)
        const result = await this.get()

        return {
            current: offset + 1,
            pages: Math.ceil(paged.length / size),
            total: paged.length,
            data: result
        }
    }

    /**
     * Sync many-to-many relations
     *
     * @param relation
     * @param id
     * @param ids
     */
    async sync(relation: string, id: string, ids: string[]) {
        const relationData = metadataStorage.findRelation(this.model.name, relation)
        if (!relationData) {
            throw new Error(`Relation data not found for: ${this.model.name} and relation: ${relation}`)
        }
        await sync(this.db, relationData, id, ids)
    }

    /**
     * Cast model properties
     *
     * @param name
     * @param value
     */
    cast(name: string, value: any) {
        const fieldMeta = metadataStorage.findField(this.model.name, name)
        if (!fieldMeta) {
            return value
        }

        if (fieldMeta.cast === 'boolean') {
            return !!value
        }

        return value
    }

    /**
     * Get primary key for models
     */
    getPrimaryKey() {
        return uuid.v4()
    }

    /**
     * A hook to set the query directly
     *
     * @param cb
     */
    query(cb: (query: Knex.QueryBuilder, db?: Knex) => void) {
        cb(this._query, this.db)
        return this
    }

    /**
     * Set custom relations for the current query
     *
     * @param relations
     */
    with(relations: string[]) {
        this._with = relations
        return this
    }

    /**
     * Query orderBy
     *
     * @param key
     * @param dir
     */
    orderBy(key: string, dir: string): this {
        this._query.orderBy(key, dir)
        return this
    }

    /**
     * Query groupBy
     *
     * @param args
     */
    groupBy(...args: any): this {
        this._query.groupBy.apply(this._query, args)
        return this
    }

    /**
     * Query where
     *
     * @param args
     */
    where(...args: any): this {
        this._query.where.apply(this._query, args)
        return this
    }

    /**
     * Query whereIn
     *
     * @param args
     */
    whereIn(...args: any[]) {
        this._query.whereIn.apply(this._query, args)
        return this
    }

    /**
     * Query whereExists
     *
     * @param cb
     */
    whereExists(cb) {
        this._query.whereExists(cb(this.db))
        return this
    }

    /**
     * Parse object key-value pairs to build where conditionals
     *
     * @param params
     */
    private buildWhere(params) {
        if (params && typeof params !== 'object') {
            throw new Error('Query parameters must be an object')
        }
        if (!params) {
            return null
        }
        for (const i in params) {
            this._query.where(i, params[i])
        }
    }
}
