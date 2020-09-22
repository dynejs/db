import { Field, HasOne, Model, Repo } from '../../src'
import { Address } from './address'

@Model({
    table: 'users',
    with: []
})
export class User {

    @Field()
    id: string

    @Field()
    name: string

    @Field()
    email: string

    @HasOne(() => Address)
    @Field()
    address: Address
}

export const user = () => new Repo(User)
