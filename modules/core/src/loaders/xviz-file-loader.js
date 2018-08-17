// Copyright (c) 2019 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import assert from 'assert';
import {
  LOG_STREAM_MESSAGE,
  parseBinaryXVIZ,
  parseStreamMessage,
  StreamSynchronizer,
  XvizStreamBuffer
} from '@xviz/parser';

import XVIZLoaderInterface from './xviz-loader-interface';
import {requestBinary, requestJson} from '../utils/request-utils';

function getParams(options) {
  const {timestamp, serverConfig} = options;

  return {
    timestamp,
    serverConfig
  };
}

const DEFUALT_BATCH_SIZE = 4;

export default class XVIZFileLoader extends XVIZLoaderInterface {
  constructor(options) {
    super(options);

    assert(options.getFileInfo);
    this._getFileInfo = options.getFileInfo;
    this._batchSize = options.batchSize || DEFUALT_BATCH_SIZE;
    this._startFrame = options.startFrame || 0;

    this.requestParams = getParams(options);
    this.streamBuffer = new XvizStreamBuffer();
    this.logSynchronizer = null;
    this.metadata = null;
    this._isOpen = true;
  }

  isOpen() {
    return this._isOpen;
  }

  connect() {
    if (this._isOpen) {
      this._loadNextBatch(this._startFrame);
    }
  }

  close() {
    // Stop file loading
    this._isOpen = false;
  }

  getBufferRange() {
    return this.streamBuffer.getLoadedTimeRange();
  }

  seek(timestamp) {
    this.timestamp = timestamp;
    // TODO incomplete
  }

  _loadNextBatch(startFrame) {
    if (!this.isOpen()) {
      return;
    }

    const params = this.requestParams;
    const arrayOfNFrames = [];
    let isLastFrame = false;

    for (let i = 0; i < this._batchSize && !isLastFrame; i++) {
      const fileInfo = this._getFileInfo(startFrame + i);
      // if there is more file to load
      if (!fileInfo) {
        isLastFrame = true;
      } else {
        arrayOfNFrames.push(this._loadFile(fileInfo));
      }
    }

    if (isLastFrame) {
      return;
    }

    // if there are more frames need to fetch
    if (arrayOfNFrames.length > 0) {
      Promise.all(arrayOfNFrames.filter(Boolean))
        .then(frames => {
          frames.forEach(data =>
            parseStreamMessage({
              message: data instanceof ArrayBuffer ? parseBinaryXVIZ(data) : data,
              onResult: this._onMessage,
              onError: this._onError,
              worker: params.serverConfig.worker,
              maxConcurrency: params.serverConfig.maxConcurrency
            })
          );
          this._loadNextBatch(startFrame + this._batchSize);
        })
        .catch(error => {
          this.emit('error', error);
        });
    }
  }

  _loadFile({filePath, fileFormat}) {
    switch (fileFormat) {
      case 'binary':
        return requestBinary(filePath);

      case 'json':
        return requestJson(filePath);

      default:
        this.emit('error', 'Invalid file format.');
        return null;
    }
  }

  _onMessage = message => {
    switch (message.type) {
      case LOG_STREAM_MESSAGE.METADATA:
        this.logSynchronizer = new StreamSynchronizer(message.start_time, this.streamBuffer);
        this.metadata = message;
        this.emit('ready', message);
        break;

      case LOG_STREAM_MESSAGE.TIMESLICE:
        this.streamBuffer.insert(message);
        this.emit('update', message);
        break;

      case LOG_STREAM_MESSAGE.DONE:
        this.emit('finish', message);
        break;

      default:
        this.emit('error', message);
    }
  };

  _onError = error => {
    this.emit('error', error);
  };
}
