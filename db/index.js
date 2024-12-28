import { config } from "dotenv";
import { MongoClient } from "mongodb";
config();

class DbService {
  static connected = false;
  static host = process.env.DB_HOST;
  static dbName = process.env.DB_NAME;
  static client = null;
  static connection = null;

  static async connect() {
    console.log(this.host, this.dbName);
    try {
      if (!this.connected) {
        this.client = new MongoClient(this.host);
        this.connected = true;
        this.client.on("open", () => {
          console.log("db opened");
          this.connected = true;
        });
        this.client.on("topologyClosed", () => {
          console.log("db closed");
          this.connected = false;
        });

        this.connection = await this.client.connect();
      }
      return this.connection;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async insert(data, collection) {
    await this.connect();

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .insertOne(data)
      .then((result) => {
        return result;
      });
  }

  static async insertAll(data, collection) {
    await this.connect();

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .insertMany(data)
      .then((result) => {
        return result;
      });
  }

  static async deleteAll(condition, collection) {
    await this.connect();

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .deleteMany(condition)
      .then((result) => {
        return result;
      });
  }

  static async delete(condition, collection) {
    await this.connect();

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .deleteOne(condition)
      .then((result) => {
        return result;
      });
  }

  static async updateOne(updateCondition, data, collection) {
    await this.connect();

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .updateOne(updateCondition, { $set: data }, { upsert: true })
      .then((result) => {
        return result;
      })
      .catch((err) => {
        console.log("Error in updateOne", err);
      });
  }
  static async updateAll(updateCondition, data, collection) {
    await this.connect();

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .updateMany(updateCondition, data, { upsert: true })
      .then((result) => {
        return result;
      })
      .catch((err) => {
        console.log("Error in updateAll", err);
      });
  }

  static async close() {
    let dbClose = await this.connection.close();
    this.connection = null;
    return dbClose;
  }

  static async findCount(filters, collection) {
    await this.connect();

    if (!filters) filters = {};
    return (
      this.connection
        .db(this.dbName)
        .collection(collection)
        .find(filters)
        //.limit(10)
        .sort({ id: -1 })
        .count()
        .then((results) => {
          return results;
        })
        .catch((err) => {
          console.log("Error in find", err);
        })
    );
  }

  static async collectionCount(collection) {
    await this.connect();

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .count()
      .then((results) => {
        return results;
      })
      .catch((err) => {
        console.log("Error in find", err);
      });
  }

  static async findLimitSort(filters, collection, limit = 0) {
    await this.connect();

    if (!filters) filters = {};
    return this.connection
      .db(this.dbName)
      .collection(collection)
      .find(filters)
      .limit(limit)
      .sort({ date: -1 })
      .toArray()
      .then((results) => {
        return results;
      })
      .catch((err) => {
        console.log("Error in find", err);
      });
  }

  static async find(filters, collection, project = {}, sort) {
    await this.connect();

    if (!filters) filters = {};
    return (
      this.connection
        .db(this.dbName)
        .collection(collection)
        .find(filters)
        .sort(sort || {})
        .project(project || {})
        //.limit(100)
        .toArray()
        .then((results) => {
          return results;
        })
        .catch((err) => {
          console.log("Error in find", err);
        })
    );
  }
  static async findSelect(filters, collection, project = {}) {
    await this.connect();

    if (!filters) filters = {};
    return (
      this.connection
        .db(this.dbName)
        .collection(collection)
        .find(filters)
        .project(project)
        //.limit(100)
        .toArray()
        .then((results) => {
          return results;
        })
        .catch((err) => {
          console.log("Error in find", err);
        })
    );
  }

  static async findOne(info, collection, projection) {
    await this.connect();

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .findOne(info, { projection: projection })
      .then((results) => {
        return results;
      })
      .catch((err) => {
        console.log("Error in getOne", err);
      });
  }

  static async findAndLimit(filters, collection, limit) {
    await this.connect();

    if (!filters) filters = {};

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .find(filters)
      .limit(Number(limit))
      .toArray()
      .then((results) => {
        return results;
      })
      .catch((err) => {
        console.log("Error in getOne", err);
      });
  }

  static async getLastField(filters, sort, collection) {
    await this.connect();

    if (!filters) filters = {};

    return this.connection
      .db(this.dbName)
      .collection(collection)
      .find(filters)
      .sort(sort)
      .limit(1)
      .toArray()
      .then((results) => {
        return results;
      })
      .catch((err) => {
        console.log("Error in getOne", err);
      });
  }
}

export default DbService;
