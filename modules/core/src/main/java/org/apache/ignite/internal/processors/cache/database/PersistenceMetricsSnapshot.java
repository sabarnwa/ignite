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
package org.apache.ignite.internal.processors.cache.database;

import org.apache.ignite.PersistenceMetrics;

/**
 *
 */
public class PersistenceMetricsSnapshot implements PersistenceMetrics {
    /** */
    private float walLoggingRate;

    /** */
    private float walWritingRate;

    /** */
    private int walArchiveSegments;

    /** */
    private float walFsyncTimeAvg;

    /** */
    private long lastCpDuration;

    /** */
    private long lastCpFsyncDuration;

    /** */
    private long lastCpTotalPages;

    /** */
    private long lastCpDataPages;

    /** */
    private long lastCpIndexPages;

    /** */
    private long lastCpCowPages;

    /**
     * @param metrics Metrics.
     */
    public PersistenceMetricsSnapshot(PersistenceMetrics metrics) {
        walLoggingRate = metrics.getWalLoggingRate();
        walWritingRate = metrics.getWalWritingRate();
        walArchiveSegments = metrics.getWalArchiveSegments();
        walFsyncTimeAvg = metrics.getWalFsyncTimeAverage();
        lastCpDuration = metrics.getLastCheckpointingDuration();
        lastCpFsyncDuration = metrics.getLastCheckpointFsyncDuration();
        lastCpTotalPages = metrics.getLastCheckpointTotalPagesNumber();
        lastCpDataPages = metrics.getLastCheckpointDataPagesNumber();
        lastCpIndexPages = metrics.getLastCheckpointIndexPagesNumber();
        lastCpCowPages = metrics.getLastCheckpointCopiedOnWritePagesNumber();
    }

    /** {@inheritDoc} */
    @Override public float getWalLoggingRate() {
        return walLoggingRate;
    }

    /** {@inheritDoc} */
    @Override public float getWalWritingRate() {
        return walWritingRate;
    }

    /** {@inheritDoc} */
    @Override public int getWalArchiveSegments() {
        return walArchiveSegments;
    }

    /** {@inheritDoc} */
    @Override public float getWalFsyncTimeAverage() {
        return walFsyncTimeAvg;
    }

    /** {@inheritDoc} */
    @Override public long getLastCheckpointingDuration() {
        return lastCpDuration;
    }

    /** {@inheritDoc} */
    @Override public long getLastCheckpointFsyncDuration() {
        return lastCpFsyncDuration;
    }

    /** {@inheritDoc} */
    @Override public long getLastCheckpointTotalPagesNumber() {
        return lastCpTotalPages;
    }

    /** {@inheritDoc} */
    @Override public long getLastCheckpointDataPagesNumber() {
        return lastCpDataPages;
    }

    /** {@inheritDoc} */
    @Override public long getLastCheckpointIndexPagesNumber() {
        return lastCpIndexPages;
    }

    /** {@inheritDoc} */
    @Override public long getLastCheckpointCopiedOnWritePagesNumber() {
        return lastCpCowPages;
    }
}
