import uuid = require('uuid')
import Knex = require('knex')
import { Constructable, resolve } from '@dynejs/core'
import { metadataStorage } from './metadata/metadata-storage'
import { Connection } from './connection'
import { HasOne } from './relations/has-one'
import { BelongsTo } from './relations/belongs-to'
import { HasMany } from './relations/has-many'
import { BelongsToMany } from './relations/belongs-to-many'
import { QueryBuilder } from 'knex'

export type QueryModifier = (query: QueryBuilder, db?: Knex) => void

export type QueryConditions = {
    [key: string]: any
}

export interface Model {
    id?: string
    transform?: () => void
    format?: () => void
}

export interface DBRow {
    [key: string]: string
}

export class Repo<T> {

    /**
     * Get current connection(Knex) instance
     */
    static getDB() {
        return resolve(Connection).active()
    }

    /**
     * Get the query builder
     *
     * @param model
     */
    static getBuilder<T>(model: Constructable<T>): QueryBuilder {
        const db = this.getDB()
        const modelDescription = metadataStorage.getModelMeta(model.name)

        return db(modelDescription.table)
    }

    /**
     * Get default relations for the model
     *
     * @param model
     */
    static getRelations<T>(model: Constructable<T>) {
        return metadataStorage.getRelations(model.name)
    }

    /**
     * Get fields info for model
     *
     * @param model
     */
    static getFields<T>(model: Constructable<T>) {
        return metadataStorage.getFields(model.name)
    }

    /**
     * Get model "with" setting
     *
     * @param model
     */
    static getModelWith<T>(model: Constructable<T>) {
        return metadataStorage.getModelMeta(model.name)?.with || []
    }

    /**
     * Casts a model from attributes
     * if not filter presented all model fields will be set
     * if field not presented, it will be undefined
     *
     * @param model
     * @param params
     * @param filter
     */
    static cast<T>(model: Constructable<T>, params, filter?: string[]): T {
        const fields = this.getFields(model) || []
        const m = new model()

        if (!filter) {
            filter = Object.keys(params)
        }
        return fields
            .filter(f => filter ? filter.indexOf(f.name) > -1 : true)
            .reduce((acc, field) => {
                acc[field.name] = params[field.name]
                return acc
            }, m)
    }

    /**
     * Used internally but public for make queries on related repos
     */
    static async rawGet<T>(model: Constructable<T>, query?: QueryModifier | QueryConditions, preload?: string[]): Promise<T[]> {
        const builder = this.getBuilder(model)

        this.changeQuery(builder, query)

        // Runs the query
        let result = await builder

        const _with = preload || this.getModelWith(model)
        const relations = this.getRelations(model).filter(relation => {
            return _with
                ? _with.indexOf(relation.as) > -1
                : true
        })

        for (const relation of relations) {
            if (relation.type === 'has-one') {
                await (new HasOne(result, relation)).build()
            }

            if (relation.type === 'belongs-to') {
                await (new BelongsTo(result, relation)).build()
            }

            if (relation.type === 'has-many') {
                await (new HasMany(result, relation)).build()
            }

            if (relation.type === 'belongs-to-many') {
                await (new BelongsToMany(result, relation)).build()
            }
        }

        return result
    }

    /**
     * Formats the result based on fields metadata
     *
     * @param model
     * @param result
     */
    static format<T extends Model>(model: Constructable<T>, result: T[] | T): any {
        if (!result) {
            return null
        }

        const formatFields = (item: T) => {
            const fields = this.getFields(model) || []
            const m = new model()

            fields.reduce((acc, field) => {
                acc[field.name] = item[field.name]
                return acc
            }, m)

            // Run a format, to make additional changes on model
            if (typeof m.format === 'function') {
                m.format()
            }

            return m
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
    static async get<T>(model: Constructable<T>, query?: QueryModifier | QueryConditions, preload?: string[]): Promise<T[]> {
        let result = await this.rawGet(model, query, preload)

        return this.format(model, result)
    }

    /**
     * Retreive only one result from the query result
     */
    static async find<T>(model: Constructable<T>, query?: QueryModifier | QueryConditions, preload?: string[]): Promise<T> {
        const res = await this.get(model, query, preload)

        return res.shift()
    }

    /**
     * Runs a new insert query with the given attributes
     *
     * @param model
     */
    static async create<T extends Model>(model: T): Promise<string> {
        const builder = this.getBuilder(model.constructor as Constructable<T>)

        if (typeof model.transform === 'function') {
            await model.transform()
        }

        model = Object.assign(model, {
            id: this.getPrimaryKey(),
            created_at: new Date(),
            updated_at: new Date()
        })

        await builder.insert(model)
        return model.id
    }

    /**
     * Updates a record with the given attributes
     *
     * @param model
     * @param query
     */
    static async update<T extends Model>(model: T, query?: QueryModifier | QueryConditions): Promise<boolean> {
        const builder = this.getBuilder(model.constructor as Constructable<T>)

        builder.where('id', model.id)
        this.changeQuery(builder, query)

        if (typeof model.transform === 'function') {
            await model.transform()
        }

        model = Object.assign(model, {
            updated_at: new Date()
        })

        const updated = await builder.update(model)
        return updated !== 0
    }

    /**
     * Creates or updates a model depending on
     * primary key exists
     *
     * @param model
     */
    static async createOrUpdate<T extends Model>(model: T) {
        if (model.id) {
            return Repo.update(model)
        }
        return Repo.create(model)
    }

    /**
     * Deletes a record with the current query
     *
     * @param model
     * @param query
     */
    static async destroy<T extends Model>(model: T, query?: QueryModifier | QueryConditions): Promise<boolean> {
        const builder = this.getBuilder(model.constructor as Constructable<T>)

        builder.where('id', model.id)
        this.changeQuery(builder, query)

        const deleted = await builder.delete()
        return deleted !== 0
    }

    /**
     * Paginates the result set
     *
     * @param model
     * @param query
     * @param size
     * @param offset
     */
    static async paginate<T>(model: Constructable<T>, size = 30, offset: number | string = 0, query?: QueryModifier) {
        offset = Number(offset)
        const builder = this.getBuilder(model)

        this.changeQuery(builder, query)

        const paged = await builder.clone()

        builder.limit(size).offset(offset * size)
        const result = await this.get(model, query)

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
     * @param model
     * @param relation
     * @param id
     * @param ids
     */
    static async sync<T>(model: Constructable<T>, relation: string, id: string, ids: string[]) {
        const relationData = metadataStorage.findRelation(model.name, relation)

        if (!relationData) {
            throw new Error(`Relation data not found for: ${model.name} and relation: ${relation}`)
        }
        await (new BelongsToMany([], relationData)).sync(this.getDB(), id, ids)
    }

    /**
     * Get primary key for models
     */
    static getPrimaryKey() {
        return uuid.v4()
    }

    /**
     * Run hooks for chaning query
     *
     * @param builder
     * @param query
     */
    private static changeQuery(builder: QueryBuilder, query: QueryModifier | QueryConditions) {
        if (query && typeof query === 'function') {
            query(builder, this.getDB())
        }

        if (query && typeof query === 'object') {
            this.buildWhere(builder, query)
        }
    }

    /**
     * Parse object key-value pairs to build where conditionals
     *
     * @param query
     * @param params
     */
    private static buildWhere(query, params) {
        if (params && typeof params !== 'object') {
            throw new Error('Query parameters must be an object')
        }
        if (!params) {
            return null
        }
        for (const i in params) {
            query.where(i, params[i])
        }
    }
}
