import { Field, Model } from '../../src'

@Model({
    table: 'comments'
})
export class Comment {
    @Field()
    id: string

    @Field()
    comment: string

    @Field()
    post_id: string
}
