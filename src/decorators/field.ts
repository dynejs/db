import { metadataStorage } from '../metadata/metadata-storage'

/**
 * Field decorator options
 */
export interface FieldOptions {
    cast?: string
}

/**
 * Field decorator for decoration model properties
 *
 * @param opts
 */
export function Field(opts: FieldOptions = {}) {
    return (cls, name) => {
        metadataStorage.fields.push({
            class: cls.constructor.name,
            cast: opts.cast,
            name: name
        })
    }
}
