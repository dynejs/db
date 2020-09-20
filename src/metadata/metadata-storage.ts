import { ModelOptions } from "../decorators/model"
import { FieldOptions } from "../decorators/field"
import { RelationOptions } from "../decorators/relation"

/**
 * Extends field options with internal properties
 */
export interface FieldMetadataArgs extends FieldOptions {
    name: string
    class: string
}

/**
 * Extends field options with internal properties
 */
export interface RelationMetadataArgs extends RelationOptions {
    as: string
    class: string
}

/**
 * Extends field options with internal properties
 */
export interface ModelMetadataArgs extends ModelOptions {
    class: string
}

export class MetadataStorage {

    /**
     * Models metadata repo
     */
    models: ModelMetadataArgs[]

    /**
     * Fields metadata repo
     */
    fields: FieldMetadataArgs[]

    /**
     * Relations metadata repo
     */
    relations: RelationMetadataArgs[]

    constructor() {
        this.models = []
        this.fields = []
        this.relations = []
    }

    /**
     * Get a model metadata by class name
     *
     * @param name
     */
    getModelMeta(name: string) {
        return this.models.find(model => model.class === name)
    }

    /**
     * Get registered relations for a given model
     *
     * @param name
     */
    getRelations(name: string) {
        return this.relations.filter(r => r.class === name)
    }

    /**
     * Get one relation meta for a class property
     *
     * @param name
     * @param prop
     */
    findRelation(name: string, prop: string) {
        return this.relations.find(r => {
            return r.class === name && r.as === prop
        })
    }

    /**
     * Get fields for a given model
     *
     * @param name
     */
    getFields(name: string) {
        return this.fields.filter(r => r.class === name)
    }

    /**
     * Retrieve a field metadata by class property
     *
     * @param name
     * @param prop
     */
    findField(name: string, prop: string) {
        return this.fields.find(r => {
            return r.class === name && r.name === prop
        })
    }
}

export const metadataStorage = new MetadataStorage()
