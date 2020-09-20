import { Model, Field, Relation, Repo } from '../../src'
import { Address } from './address'

@Model({
    table: 'users',
})
export class User {

    @Field()
    id: string

    @Field()
    name: string

    @Field()
    email: string

    @Relation({
        model: Address,
        localKey: 'id',
        foreignKey: 'user_id',
        single: true
    })
    @Field()
    address: Address
}

export const user = () => new Repo(User)
