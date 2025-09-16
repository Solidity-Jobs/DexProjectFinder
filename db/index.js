<<<<<<< HEAD
import { config } from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
config();
const uri =
  "mongodb+srv://alejandropty:psw123456@cluster0.4fpc3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tls=true&tlsAllowInvalidCertificates=true";
class DbService {
  static connected = false;
  static host = uri;
  static dbName = process.env.DB_NAME;
  static client = null;
  static connection = null;

  static async connect() {
    console.log(this.host, this.dbName);
    try {
      if (!this.connected) {
        this.client = new MongoClient(this.host, {
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          },
        });

        this.connection = await this.client.connect();
        await this.connection.db("dexfinder").command({ ping: 1 });
        this.connected = true;
        console.log(
          "Pinged your deployment. You successfully connected to MongoDB!"
        );
      }
      return this.connection;
    } catch (error) {
      console.log("DB connect error ==>", error);
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

    // return this.connection
    //   .db(this.dbName)
    //   .collection(collection)
    //   .insertMany(data)
    //   .then((result) => {
    //     return result;
    //   });
    const db = this.connection.db(this.dbName);
    const col = db.collection(collection);

    const keyFields = ["ChainName", "TokenName", "PoolAddress", "TokenAddress"];

    for (const item of data) {
      const filter = {};
      keyFields.forEach((field) => {
        filter[field] = item[field];
      });

      try {
        await col.findOneAndUpdate(filter, { $set: item }, { upsert: true });
      } catch (err) {
        console.error("Error updating document:", err);
      }
    }

    console.log("Data saved/updated successfully");
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
        .limit(100)
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
        .limit(100)
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
=======
import { config } from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
config();
const uri =
  "mongodb+srv://alejandropty:psw123456@cluster0.4fpc3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tls=true&tlsAllowInvalidCertificates=true";
class DbService {
  static connected = false;
  static host = uri;
  static dbName = process.env.DB_NAME;
  static client = null;
  static connection = null;

  static async connect() {
    console.log(this.host, this.dbName);
    try {
      if (!this.connected) {
        this.client = new MongoClient(this.host, {
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          },
        });

        this.connection = await this.client.connect();
        await this.connection.db("dexfinder").command({ ping: 1 });
        this.connected = true;
        console.log(
          "Pinged your deployment. You successfully connected to MongoDB!"
        );
      }
      return this.connection;
    } catch (error) {
      console.log("DB connect error ==>", error);
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
>>>>>>> 0914f4454f79f7364b2da684a3809f04313582eb
