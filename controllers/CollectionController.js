const Collection = require("../models/Collection")

exports.add = async (data) => {
  try {
    if (!data.address || !data.name) throw new Error('Missing required parameters.')
    const collection = new Collection()
    Object.entries(data).forEach(([key, val]) => {
      collection[key] = val
    })
    await collection.save()
    return Promise.resolve(collection)
  } catch (error) {
    return Promise.reject(error)
  }
}