import { HasOneOrMany } from './has-one-or-many'

export class HasOne extends HasOneOrMany {
    protected searchMethod = 'find'
}
