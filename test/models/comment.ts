import { Field, Model } from '../../src'

@Model({
    table: 'comments'
})
export class Comment {
    @Field()
    id: string

    @Field()
    comment: string

    post_id: string
}
