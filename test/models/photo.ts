import { Field, Model } from '../../src'

@Model({
    table: 'photo'
})
export class Photo {

    @Field()
    id: string

    @Field()
    title: string

    @Field()
    order: number

    @Field()
    related_id: string

    related_type: string
}
