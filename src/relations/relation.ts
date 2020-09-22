import { DBRow, Repo } from '../repo'
import { metadataStorage, ModelMetadataArgs, RelationMetadataArgs } from '../metadata/metadata-storage'
import Knex from 'knex'

export abstract class Relation {

    protected result: DBRow[]

    protected repo: Repo<any>

    protected meta: RelationMetadataArgs

    constructor(result: DBRow[], relation: RelationMetadataArgs) {
        this.result = result
        this.meta = relation
        this.repo = new Repo(relation.model())

        this.repo.query(query => {
            this.query(query)
            this.customQuery(query)
        })
    }

    abstract query(query: Knex.QueryBuilder)

    abstract async appendResult(relationResult: DBRow[])

    async build() {
        const relationResult = await this.repo.rawGet()

        this.appendResult(relationResult)
    }

    /**
     * Altering the query with the custom hook if defined
     *
     * @param query
     */
    customQuery(query) {
        if (this.meta.query) {
            this.meta.query(query)
        }
    }

    parentIdentifier(): string {
        return `${this.meta.class.toLowerCase()}_id`
    }

    relatedIdentifier(): string {
        return `${this.meta.model().name.toLowerCase()}_id`
    }

    relatedModelMeta(): ModelMetadataArgs {
        return metadataStorage.getModelMeta(this.meta.model().name)
    }
}
