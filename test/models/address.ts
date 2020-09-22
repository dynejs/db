import { BelongsTo, Field, Model, Repo } from '../../src'
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

    @BelongsTo(() => User)
    @Field()
    user: User

    user_id: string
}

export const address = () => new Repo(Address)
