import { Constructable } from "@dynejs/core/dist/container"
import { metadataStorage } from "../metadata/metadata-storage"

/**
 * Model decorator options
 */
export interface ModelOptions {
    table: string
    with?: string[]
}

/**
 * Decorate query classes with database table, name and relations
 *
 * @param opts
 * @constructor
 */
export function Model(opts: ModelOptions) {
    return (target: Constructable<any>) => {
        metadataStorage.models.push({
            class: target.name,
            table: opts.table,
            with: opts.with
        })
    }
}
