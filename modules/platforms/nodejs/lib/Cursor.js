/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const Errors = require('./Errors');
const BinaryUtils = require('./internal/BinaryUtils');
const BinaryObject = require('./BinaryObject');
const BinaryReader = require('./internal/BinaryReader');
const BinaryWriter = require('./internal/BinaryWriter');

/**
 * Class representing a cursor to obtain results of SQL and Scan query operations.
 *
 * The class has no public constructor. An instance of this class is obtained
 * via query() method of {@link CacheClient} objects.
 * One instance of this class returns results of one SQL or Scan query operation.
 *
 * @hideconstructor
 */
class Cursor {

    /**
     * Returns one cache entry (key-value pair) from the query results.
     *
     * Every new call returns the next cache entry from the query results.
     * If the method returns null, no more entries are available.
     *
     * @async
     *
     * @return {Promise<CacheEntry>} - a cache entry (key-value pair).
     */
    async getValue() {
        if (!this._values || this._valueIndex >= this._values.length) {
            await this._getValues();
            this._valueIndex = 0;
        }
        if (this._values) {
            const value = this._values[this._valueIndex];
            this._valueIndex++;
            return value;
        }
        return null;
    }

    /**
     * Checks if more cache entries are available in the query results.
     *
     * @return {boolean} - true if more cache entries are available, false otherwise.
     */
    hasMore() {
        return this._hasNext ||
            this._values && this._valueIndex < this._values.length;
    }

    /**
     * Returns all cache entries (key-value pairs) from the query results.
     *
     * May be used instead of getValue() method if the number of returned entries
     * is relatively small and will not cause memory utilization issues.
     *
     * @async
     *
     * @return {Promise<Array<CacheEntry>>} - all cache entries (key-value pairs)
     *   returned by SQL or Scan query.
     */
    async getAll() {
        let result = new Array();
        let values;
        do {
            values = await this._getValues();
            if (values) {
                result = result.concat(values);
            }
        } while (this._hasNext);
        return result;
    }

    /**
     * Closes the cursor. Obtaining cache entries from the results is not possible after this.
     *
     * This method should be called if no more cache entries are needed.
     * It is not neccessary to call it if all cache entries have been already obtained.
     *
     * @async
     */
    async close() {
        // Close cursor only if the server has more pages: the server closes cursor automatically on last page
        if (this._id && this._hasNext) {
            await this._socket.send(
                BinaryUtils.OPERATION.RESOURCE_CLOSE,
                async (payload) => {
                    await this._write(payload);
                });
        }
    }

    /** Private methods */

    /**
     * @ignore
     */
    constructor(socket, operation, buffer, keyType = null, valueType = null) {
        this._socket = socket;
        this._operation = operation;
        this._buffer = buffer;
        this._keyType = keyType;
        this._valueType = valueType;
        this._id = null;
        this._hasNext = false;
        this._values = null;
        this._valueIndex = 0;
    }

    /**
     * @ignore
     */
    async _getNext() {
        this._hasNext = false;
        this._values = null;
        this._buffer = null;
        await this._socket.send(
            this._operation,
            async (payload) => {
                await this._write(payload);
            },
            async (payload) => {
                this._buffer = payload;
            });
    }

    /**
     * @ignore
     */
    async _getValues() {
        if (!this._buffer && this._hasNext) {
            await this._getNext();
        }
        await this._read(this._buffer)
        this._buffer = null;
        return this._values;
    }

    /**
     * @ignore
     */
    async _write(buffer) {
        buffer.writeLong(this._id);
    }


    /**
     * @ignore
     */
    async _read(buffer) {
        const id = buffer.readLong();
        if (this._id) {
            if (!this._id.equals(id)) {
                throw Errors.IgniteClientError.internalError();
            }
        }
        else {
            this._id = id;
        }
        const CacheEntry = require('./CacheClient').CacheEntry;
        const rowCount = buffer.readInteger();
        this._values = new Array(rowCount);
        for (let i = 0; i < rowCount; i++) {
            this._values[i] = new CacheEntry(
                await BinaryReader.readObject(buffer, this._keyType),
                await BinaryReader.readObject(buffer, this._valueType));
        }
        this._hasNext = buffer.readBoolean();
    }
}

/**
 * Class representing a cursor to obtain results of SQL Fields query operation.
 *
 * The class has no public constructor. An instance of this class is obtained
 * via query() method of {@link CacheClient} objects.
 * One instance of this class returns results of one SQL Fields query operation.
 *
 * @hideconstructor
 */
class SqlFieldsCursor extends Cursor {

    /**
     * ???
     * Returns a portion of results - field values returned by the query.
     *
     * Every new call returns the next portion of results.
     * If the method returns null, no more results are available.
     *
     * @async
     *
     * @return {Promise<Array<*>>} - a portion of results returned by SQL Fields query.
     *   Every element of the array is an array with values of the fields requested by the query.
     *
     */
    async getValue() {
        return await super.getValue();
    }

    /**
     * Returns all results - field values returned by the query.
     *
     * May be used instead of getValue() method if the number of returned elements
     * is relatively small and will not cause memory utilization issues.
     *
     * @async
     *
     * @return {Promise<Array<CacheEntry>>} - all results returned by SQL Fields query.
     *   Every element of the array is an array with values of the fields requested by the query.
     *
     */
    async getAll() {
        return await super.getAll();
    }

    /**
     * Returns names of the fields which were requested in the SQL Fields query.
     *
     * Empty array is returned if "include field names" flag was false in the query.
     *
     * @return {Array<string>} - field names.
     *   The order of names corresponds to the order of field values returned in the results of the query.
     */
    getFieldNames() {
        return this._fieldNames;
    }

    /**
     * Specifies types of the fields returned by the SQL Fields query.
     *
     * By default, a type of every field is not specified that means during operations the Ignite client
     * will try to make automatic mapping between JavaScript types and Ignite object types -
     * according to the mapping table defined in the description of the {@link ObjectType} class.
     *
     * @param {...ObjectType.PRIMITIVE_TYPE | CompositeType} fieldTypes - types of the returned fields.
     *   The order of types must correspond the order of field values returned in the results of the query.
     *   A type of every field can be:
     *   - either a type code of primitive (simple) type
     *   - or an instance of class representing non-primitive (composite) type
     *   - or null (means the type is not specified)
     *
     * @return {SqlFieldsCursor} - the same instance of the SqlFieldsCursor.
     */
    setFieldTypes(...fieldTypes) {
        this._fieldTypes = fieldTypes;
        return this;
    }

    /** Private methods */

    /**
     * @ignore
     */
    constructor(socket, buffer) {
        super(socket, BinaryUtils.OPERATION.QUERY_SQL_FIELDS_CURSOR_GET_PAGE, buffer);
        this._fieldNames = [];
    }

    /**
     * @ignore
     */
    async _readFieldNames(buffer, includeFieldNames) {
        this._id = buffer.readLong();
        this._fieldCount = buffer.readInteger();
        if (includeFieldNames) {
            for (let i = 0; i < this._fieldCount; i++) {
                this._fieldNames[i] = await BinaryReader.readObject(buffer);
            }
        }
    }

    /**
     * @ignore
     */
    async _read(buffer) {
        const rowCount = buffer.readInteger();
        this._values = new Array(rowCount);
        let values;
        let fieldType;
        for (let i = 0; i < rowCount; i++) {
            values = new Array(this._fieldCount);
            for (let j = 0; j < this._fieldCount; j++) {
                fieldType = this._fieldTypes && j < this._fieldTypes.length ? this._fieldTypes[j] : null;
                values[j] = await BinaryReader.readObject(buffer);
            }
            this._values[i] = values;
        }
        this._hasNext = buffer.readBoolean();
    }
}

module.exports.Cursor = Cursor;
module.exports.SqlFieldsCursor = SqlFieldsCursor;