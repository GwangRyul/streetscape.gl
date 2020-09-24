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

/* global document, console */
/* eslint-disable no-console, no-unused-vars, no-undef */
import React, {PureComponent} from 'react';
import {render} from 'react-dom';

import {setXVIZConfig, getXVIZConfig} from '@xviz/parser';
import {
  LogViewer,
  PlaybackControl,
  StreamSettingsPanel,
  MeterWidget,
  TrafficLightWidget,
  TurnSignalWidget,
  XVIZPanel,
  VIEW_MODE
} from 'streetscape.gl';
import {Form} from '@streetscape.gl/monochrome';

import {XVIZ_CONFIG, APP_SETTINGS, MAPBOX_TOKEN, MAP_STYLE, XVIZ_STYLE, CAR} from './constants';

setXVIZConfig(XVIZ_CONFIG);




const TIMEFORMAT_SCALE = getXVIZConfig().TIMESTAMP_FORMAT === 'seconds' ? 1000 : 1;

// __IS_STREAMING__ and __IS_LIVE__ are defined in webpack.config.js
const exampleLog = require('./log-from-file').default;

class Example extends PureComponent {
  state = {
    log: exampleLog,
    settings: {
      viewMode: 'PERSPECTIVE',
      showTooltip: false
    }
  };

  componentDidMount() {
    this.state.log.on('error', console.error).connect();
  }

  _onSettingsChange = changedSettings => {
    this.setState({
      settings: {...this.state.settings, ...changedSettings}
    });
  };
  _onSettingMySetting = onChangedSettings => {
    this.setState( {
      settings: {...this.state.settings, ...onChangedSettings}
    });
  }

  render() {
    const {log, settings} = this.state;
    //new webpack.EnvironmentPlugin(['NODE_ENV', 'DEBUG']);

    return (
      <div id="container">
        <div id="control-panel">
          <XVIZPanel log={log} name="Metrics" />
          <hr />
          <XVIZPanel log={log} name="Camera" />
          <hr />
          <Form
            data={APP_SETTINGS}
            values={this.state.settings}
            onChange={this._onSettingsChange}
          />
          <StreamSettingsPanel log={log} />
        </div>
        <div id="log-panel">
          <div id="map-view">
            <LogViewer
              log={log}
              mapboxApiAccessToken= "pk.eyJ1IjoiZ3dhbmdyeXVsIiwiYSI6ImNrZmRwcnMzMjFyeDQyeXFneXE3aHBid3kifQ.urnQG35_4DuT7D5lF5sBHA"
              mapStyle={MAP_STYLE}
              car={CAR}
              xvizStyles={XVIZ_STYLE}
              showTooltip={settings.showTooltip}
              viewMode={VIEW_MODE[settings.viewMode]}
            />
            <div id="hud">
              <TurnSignalWidget log={log} streamName="/vehicle/turn_signal" />
              <hr />
              <TrafficLightWidget log={log} streamName="/vehicle/traffic_light" />
              <hr />
              <MeterWidget
                log={log}
                streamName="/vehicle/acceleration"
                label="Acceleration"
                min={-4}
                max={4}
              />
              <hr />
              <MeterWidget
                log={log}
                streamName="/vehicle/velocity"
                label="Speed"
                getWarning={x => (x > 6 ? 'FAST' : '')}
                min={0}
                max={20}
              />
            </div>
          </div>
          <div id="timeline">
            <PlaybackControl
              width="100%"
              log={log}
              formatTimestamp={x => new Date(x * TIMEFORMAT_SCALE).toUTCString()}
            />
          </div>
        </div>
      </div>
    );
  }
}
/*const corsOptions = {
  origin: 'http://localhost:8000', // 허락하고자 하는 요청 주소
  credentials: true, // true로 하면 설정한 내용을 response 헤더에 추가 해줍니다.
};

app.use(cors(corsOptions)); // config 추가
*/




render(<Example />, document.getElementById('app'));
