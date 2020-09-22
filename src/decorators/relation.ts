import { Constructable } from '@dynejs/core'
import Knex from 'knex'
import { metadataStorage } from '../metadata/metadata-storage'

export type RelationModel = () => Constructable<any>

/**
 * Relation decorator options
 */
export interface RelationOptions {
    localKey?: string
    localJoin?: string
    foreignKey?: string
    foreignJoin?: string
    joinTable?: string
    single?: boolean
    pivot?: string[]
    query?: (query: Knex.QueryBuilder) => void
}

export interface ExtendedRelationOptions extends RelationOptions {
    model: RelationModel
    type: string
}

/**
 * Relation decorator
 *
 * @param opts
 */
export function Relation(opts: ExtendedRelationOptions) {
    return (cls: any, prop: string) => {
        metadataStorage.relations.push(Object.assign(opts, {
            model: opts.model,
            type: opts.type,
            as: prop,
            class: cls.constructor.name
        }))
    }
}

/**
 * Create a decorator for a given relation type
 *
 * @param type
 */
export function createRelationDecorator(type: string) {
    return (model: RelationModel, opts: RelationOptions = {}) => {
        return (cls: any, prop: string) => {
            metadataStorage.relations.push(Object.assign(opts, {
                model,
                type,
                as: prop,
                class: cls.constructor.name
            }))
        }
    }
}

export const HasOne = createRelationDecorator('has-one')
export const HasMany = createRelationDecorator('has-many')
export const BelongsTo = createRelationDecorator('belongs-to')
export const BelongsToMany = createRelationDecorator('belongs-to-many')
