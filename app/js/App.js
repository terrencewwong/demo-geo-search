import React from 'react'
import algoliasearch from 'algoliasearch'
import algoliasearchHelper from 'algoliasearch-helper'
import {
  withScriptjs,
  withGoogleMap,
  GoogleMap,
  Marker,
  Rectangle
} from 'react-google-maps'

import { Header } from './Header'
import { Footer } from './Footer'

class RectangleWithOnMountCallback extends React.Component {
  componentDidMount () {
    this.props.onMount && this.props.onMount(this.rectangle)
  }

  render () {
    return (
      <Rectangle
        ref={node => {
          this.rectangle = node
        }}
        {...this.props}
      />
    )
  }
}

const _MyMapComponent = withScriptjs(
  withGoogleMap(props => (
    <GoogleMap
      defaultCenter={{ lat: 50.57161084594319, lng: 5.362008500000002 }}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        zoom: 4,
        minZoom: 3,
        maxZoom: 12,
        styles: [{ stylers: [{ hue: '#3596D2' }] }]
      }}
    >
      {props.children}
    </GoogleMap>
  ))
)

const MyMapComponent = props => (
  <_MyMapComponent
    googleMapURL='//maps.googleapis.com/maps/api/js?key=AIzaSyBnDR4e5_qobPG6Vn_zjhc1vyOIooChZt8'
    loadingElement={<div style={{ height: `100%` }} />}
    containerElement={<div style={{ width: '614px', height: `720px` }} />}
    mapElement={<div style={{ height: `100%` }} />}
    {...props}
  />
)

const Hit = ({ hit }) => {
  const { _highlightResult, _rankingInfo, city, distance, name } = hit

  const displayDistance = _rankingInfo.matchedGeoLocation
    ? parseInt(_rankingInfo.matchedGeoLocation.distance / 1000, 10) + ' km'
    : distance

  return (
    <div className='hit'>
      <h3
        className='hit-airport-code'
        dangerouslySetInnerHTML={{
          __html: _highlightResult.iata_code.value
        }}
      />
      <h2 className='hit-name'>
        <span
          dangerouslySetInnerHTML={{
            __html: _highlightResult.name.value
          }}
        />
        {name !== city ? (
          <span
            dangerouslySetInnerHTML={{
              __html: '- ' + _highlightResult.city.value
            }}
          />
        ) : null}
      </h2>
      <p className='hit-location'>
        <span
          dangerouslySetInnerHTML={{
            __html: _highlightResult.country.value
          }}
        />
        <span className='hit-distance'>{displayDistance}</span>
      </p>
    </div>
  )
}

const APPLICATION_ID = 'latency'
const SEARCH_ONLY_API_KEY = '6be0576ff61c053d5f9a3225e2a90f76'
const INDEX_NAME = 'demo-geosearch'
const PARAMS = { hitsPerPage: 60 }

const algolia = algoliasearch(APPLICATION_ID, SEARCH_ONLY_API_KEY)
const algoliaHelper = algoliasearchHelper(algolia, INDEX_NAME, PARAMS)

export class App extends React.Component {
  state = {
    hits: []
  }

  componentDidMount () {
    algoliaHelper.on('result', content => {
      this.setState({ hits: content.hits })
    })

    algoliaHelper.on('error', function (error) {
      console.log(error)
    })
  }

  registerBoundingBox = boundingBoxComponent => {
    const bounds = boundingBoxComponent.getBounds()
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    algoliaHelper.setQueryParameter(
      'insideBoundingBox',
      [ne.lat(), ne.lng(), sw.lat(), sw.lng()].join()
    )
    algoliaHelper.setQueryParameter('getRankingInfo', true)
    algoliaHelper.search()
  }

  handleChange = e => {
    algoliaHelper.setQuery(e.currentTarget.value).search()
  }

  render () {
    return (
      <React.Fragment>
        <Header />

        <section className='map_section'>
          <div className='left-column'>
            <input
              id='search-input'
              type='text'
              autoComplete='off'
              spellCheck='false'
              autoCorrect='off'
              placeholder='Search by name, city, airport code...'
              onChange={this.handleChange}
            />
            {this.state.hits.length === 0 ? (
              <div id='no-results-message'>
                <p>We didn't find any airports in this location.</p>
              </div>
            ) : (
              <div id='hits'>
                {this.state.hits
                  .slice(0, 20)
                  .map(hit => <Hit key={hit.iata_code} hit={hit} />)}
              </div>
            )}
          </div>
          <div className='right-column'>
            <MyMapComponent>
              <RectangleWithOnMountCallback
                onMount={rectangle => this.registerBoundingBox(rectangle)}
                options={{
                  bounds: { north: 60, south: 40, east: 16, west: -4 },
                  strokeColor: '#EF5362',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillColor: '#EF5362',
                  fillOpacity: 0.15,
                  draggable: true,
                  editable: true,
                  geodesic: true
                }}
              />
              {this.state.hits.map(hit => (
                <Marker
                  key={hit.objectID}
                  options={{
                    position: { lat: hit._geoloc.lat, lng: hit._geoloc.lng },
                    airport_id: hit.objectID,
                    title: hit.name + ' - ' + hit.city + ' - ' + hit.country
                  }}
                />
              ))}
            </MyMapComponent>
            <div id='map' />
          </div>

          <div className='clear-both' />
        </section>

        <Footer />
      </React.Fragment>
    )
  }
}
