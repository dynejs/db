import { Model, Field, Repo, Relation } from '../../src'
import { User } from './user'

@Model({
    table: 'addresses',
    with: []
})
export class Address {
    @Field()
    id: string

    @Field()
    address: string

    @Relation({
        model: () => User,
        localKey: 'user_id',
        foreignKey: 'id',
        single: true
    })
    @Field()
    user: User

    user_id: string
}

export const address = () => new Repo(Address)
