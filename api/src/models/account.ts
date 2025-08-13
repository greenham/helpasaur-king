import mongoose, { Schema, Document, PassportLocalDocument } from "mongoose"
import passportLocalMongoose from "passport-local-mongoose"

export interface IAccountDocument extends PassportLocalDocument {
  _id: mongoose.Types.ObjectId
  username: string
  password: string
  timezone?: string
  roles: string[]
}

const AccountSchema = new Schema<IAccountDocument>({
  username: String,
  password: String,
  timezone: String,
  roles: [String],
})

AccountSchema.plugin(passportLocalMongoose)

export default mongoose.model<IAccountDocument>("Account", AccountSchema)
