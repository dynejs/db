import { DBRow, Repo } from './repo'
import { metadataStorage, RelationMetadataArgs } from './metadata/metadata-storage'

export class Relation {

    /**
     * Parent result set
     */
    private result: DBRow[]

    /**
     * Relation metadata
     */
    private meta: RelationMetadataArgs

    /**
     * Current relation repository instance
     */
    private repository: Repo<any>

    constructor(result: DBRow[], relation: RelationMetadataArgs) {
        this.result = result
        this.meta = relation
        this.repository = new Repo(this.meta.model())
    }

    /**
     * Build and run the relation query and appends
     * to the parent result's items
     */
    async build() {
        const whereIds = this.result.map(r => r[this.meta.localKey])

        const relatedResult = await this.repository.query(query => {
            this.customQuery(query)

            if (this.meta.joinTable) {
                this.joinRelationQuery(query, whereIds)
                this.pivotQuery(query)
            } else {
                this.simpleRelationQuery(query, whereIds)
            }

        }).rawGet()

        this.appendResult(relatedResult)
    }

    /**
     * Appends the relation result set to parent items
     *
     * @param relatedResult
     */
    appendResult(relatedResult: DBRow[]) {
        const method = this.meta.single ? 'find' : 'filter'

        this.result.forEach(item => {
            const relationSet = relatedResult[method](relatedItem => {
                if (this.meta.joinTable) {
                    return relatedItem[this.meta.localJoin] === item[this.meta.localKey]
                }
                return relatedItem[this.meta.foreignKey] === item[this.meta.localKey]
            })

            item[this.meta.as] = this.repository.format(relationSet)
        })
    }

    /**
     * Altering query for simple joins
     *
     * @param query
     * @param whereIds
     */
    simpleRelationQuery(query, whereIds: string[]) {
        query.whereIn(this.meta.foreignKey, whereIds)
    }

    /**
     * Altering the query for joinTable joins
     * @param query
     * @param whereIds
     */
    joinRelationQuery(query, whereIds: string[]) {
        const relatedTable = metadataStorage.getModelMeta(this.meta.model().name).table

        query.leftJoin(
            this.meta.joinTable,
            `${this.meta.joinTable}.${this.meta.foreignJoin}`,
            `${relatedTable}.${this.meta.foreignKey}`
        )
        query.whereIn(`${this.meta.joinTable}.${this.meta.localJoin}`, whereIds)
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

    /**
     * Select additional fields for joinTables if defined
     *
     * @param query
     */
    pivotQuery(query) {
        if (!this.meta.pivot) {
            return
        }
        this.meta.pivot.map(field => {
            query.select(`*`)
            query.select(`${this.meta.joinTable}.${field}`)
        })
    }
}
