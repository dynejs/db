import { Relation } from './relation'
import Knex from 'knex'
import { DBRow } from '../repo'

export abstract class HasOneOrMany extends Relation {

    protected searchMethod = "filter"

    query(query: Knex.QueryBuilder) {
        const whereIds = this.result.map(item => item[this.getLocalKey()])
        query.whereIn(this.getForeignKey(), whereIds)
    }

    async appendResult(relatedResult: DBRow[]): Promise<any> {
        const foreignKey = this.getForeignKey()
        const localKey = this.getLocalKey()

        const method = this.searchMethod

        this.result.forEach(item => {
            const relationSet = relatedResult[method](relatedItem => {
                return item[localKey] === relatedItem[foreignKey]
            })

            item[this.meta.as] = this.repo.format(relationSet)
        })
    }

    private getLocalKey() {
        return this.meta.localKey
            ? this.meta.localKey
            : 'id'
    }

    private getForeignKey() {
        return this.meta.foreignKey
            ? this.meta.foreignKey
            : this.parentIdentifier()
    }
}
