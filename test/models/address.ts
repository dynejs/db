import { Model, Field, Repo } from '../../src'

@Model({
    table: 'addresses'
})
export class Address {
    @Field()
    id: string

    @Field()
    address: string

    user_id: string
}

export const address = () => new Repo(Address)
