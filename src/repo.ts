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

        const fields = this.getFields(model)

        const formatFields = (item: T) => {
            // Creating a new model
            const m = new model()

            // Set model properties
            const formattedModel = fields.reduce((acc, field) => {
                acc[field.name] = item[field.name]
                return acc
            }, m)

            // Run a format, to make additional changes on model
            if (typeof m.format === 'function') {
                m.format()
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
     * @param attributes
     */
    static async create<T>(model: Constructable<T>, attributes): Promise<string> {
        const builder = this.getBuilder(model)
        const instance: any = new model()

        const data = Object.assign(instance, attributes, {
            id: this.getPrimaryKey(),
            created_at: new Date(),
            updated_at: new Date()
        })

        if (typeof instance.transform === 'function') {
            await instance.transform()
        }

        await builder.insert(data)
        return data.id
    }

    /**
     * Updates a record with the given attributes
     *
     * @param model
     * @param attributes
     * @param query
     */
    static async update<T>(model: Constructable<T>, query: QueryModifier | QueryConditions, attributes: any): Promise<boolean> {
        const builder = this.getBuilder(model)

        this.changeQuery(builder, query)

        const instance: any = new model()
        const data = Object.assign(instance, attributes, {
            updated_at: new Date()
        })

        if (typeof instance.transform === 'function') {
            await instance.transform()
        }

        const updated = await builder.update(data)

        return updated !== 0
    }

    /**
     * Deletes a record with the current query
     *
     * @param model
     * @param query
     */
    static async destroy<T>(model: Constructable<T>, query: QueryModifier | QueryConditions): Promise<boolean> {
        const builder = this.getBuilder(model)

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
        const result = await this.get(model)

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
