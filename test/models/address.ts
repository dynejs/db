import { BelongsTo, Field, Model } from '../../src'
import { User } from './user'

@Model({
    table: 'addresses',
    with: ['user']
})
export class Address {
    @Field()
    id: string

    @Field()
    address: string

    @BelongsTo(() => User)
    @Field()
    user: User

    @Field()
    user_id: string
}
