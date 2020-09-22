import { HasOneOrMany } from './has-one-or-many'

export class HasMany extends HasOneOrMany {
    protected searchMethod = 'filter'
}
