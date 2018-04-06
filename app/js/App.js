import React from 'react'
import capitalize from 'lodash.capitalize'
import algoliasearch from 'algoliasearch'
import algoliasearchHelper from 'algoliasearch-helper'
import {
  withScriptjs,
  withGoogleMap,
  GoogleMap,
  Marker,
  Circle
} from 'react-google-maps'

import { Header } from './Header'
import { Footer } from './Footer'

// const PARIS_COORDINATES = {
//   lat: 48.8566,
//   lng: 2.3522
// }

const CITE_COORDINATES = {
  lat: 48.8748849,
  lng: 2.3474592
}

const withOnMountCallback = BaseComponent => {
  class ComponentWithOnMountCallback extends React.Component {
    componentDidMount () {
      this.props.onMount && this.props.onMount(this.node)
    }

    render () {
      return (
        <BaseComponent
          ref={node => {
            this.node = node
          }}
          {...this.props}
        />
      )
    }
  }
  ComponentWithOnMountCallback.displayName = `${
    BaseComponent.displayName
  }WithOnMountCallback`

  return ComponentWithOnMountCallback
}

const CircleWithOnMountCallback = withOnMountCallback(Circle)

const _MyMapComponent = withScriptjs(
  withGoogleMap(props => (
    <GoogleMap
      defaultCenter={CITE_COORDINATES}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        zoom: 14,
        minZoom: 10,
        maxZoom: 20,
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
    containerElement={<div style={{ height: '614px', width: `720px` }} />}
    mapElement={<div style={{ height: `100%` }} />}
    {...props}
  />
)

const Hit = ({ hit }) => {
  return (
    <div className='hit'>
      <h2 className='hit-name'>
        <span
          dangerouslySetInnerHTML={{
            __html: capitalize(hit.first_name) + ' ' + capitalize(hit.last_name)
          }}
        />
        <span> - </span>
        <span
          dangerouslySetInnerHTML={{
            __html: capitalize(hit.profession)
          }}
        />
      </h2>
    </div>
  )
}

// const APPLICATION_ID = 'latency'
// const SEARCH_ONLY_API_KEY = '6be0576ff61c053d5f9a3225e2a90f76'
// const INDEX_NAME = 'demo-geosearch'
const APPLICATION_ID = '2MFX9AG14D'
const SEARCH_ONLY_API_KEY = 'c89749f224009b7dc9684d4cf30f7b13'
const INDEX_NAME = 'annuaire_sante'
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
                  .map(hit => <Hit key={hit.objectID} hit={hit} />)}
              </div>
            )}
          </div>
          <div className='right-column'>
            <MyMapComponent>
              <CircleWithOnMountCallback
                onMount={boundingBox => this.registerBoundingBox(boundingBox)}
                options={{
                  center: CITE_COORDINATES,
                  radius: 1000,
                  strokeColor: '#EF5362',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillColor: '#EF5362',
                  fillOpacity: 0.15,
                  draggable: true,
                  editable: false,
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
          </div>

          <div className='clear-both' />
        </section>

        <Footer />
      </React.Fragment>
    )
  }
}
