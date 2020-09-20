import { Constructable } from '@dynejs/core'
import Knex from 'knex'
import { metadataStorage } from '../metadata/metadata-storage'

/**
 * Relation decorator options
 */
export interface RelationOptions {
    model: Constructable<any>
    localKey: string
    localJoin?: string
    foreignKey: string
    foreignJoin?: string
    joinTable?: string
    single?: boolean
    pivot?: string[]
    query?: (query: Knex.QueryBuilder) => void
}

/**
 * Relation decorator
 *
 * @param opts
 */
export function Relation(opts: RelationOptions) {
    return (cls: any, prop: string) => {
        metadataStorage.relations.push(Object.assign(opts, {
            as: prop,
            class: cls.constructor.name
        }))
    }
}
