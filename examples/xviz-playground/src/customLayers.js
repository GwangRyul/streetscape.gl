import {LogViewer} from 'streetscape.gl';
import {ScatterplotLayer} from 'deck.gl';

const customLayers = [
    new ScatterplotLayer({
        id: 'custom-scatterplot',

        // Scatterplot layer render options
        getPosition: d => d.position,
        getRadius: 1,
        getColor: [255, 0, 0],

        // log-related options
        streamName: '/tracklets/label',
        coordinate: 'VEHICLE_RELATIVE'
    })
];