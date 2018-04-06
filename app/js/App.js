/* global google */
import React from 'react'
import $ from 'jquery'
import algoliasearch from 'algoliasearch'
import algoliasearchHelper from 'algoliasearch-helper'
import GoogleMapReact from 'google-map-react'

import { Header } from './Header'
import { Footer } from './Footer'

class SimpleMap extends React.Component {
  static defaultProps = {
    center: {
      lat: 59.95,
      lng: 30.33
    },
    zoom: 11
  }

  render () {
    return (
      // Important! Always set the container height explicitly
      <div style={{ height: '100vh', width: '100%' }}>
        <GoogleMapReact
          bootstrapURLKeys={{ key: 'AIzaSyBnDR4e5_qobPG6Vn_zjhc1vyOIooChZt8' }}
          defaultCenter={this.props.center}
          defaultZoom={this.props.zoom}
        >
          <div lat={59.955413} lng={30.337844} text={'Kreyser Avrora'} />
        </GoogleMapReact>
      </div>
    )
  }
}

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

export class App extends React.Component {
  state = {
    hits: []
  }

  componentDidMount () {
    var APPLICATION_ID = 'latency'
    var SEARCH_ONLY_API_KEY = '6be0576ff61c053d5f9a3225e2a90f76'
    var INDEX_NAME = 'demo-geosearch'
    var PARAMS = { hitsPerPage: 60 }

    // Client + Helper initialization
    var algolia = algoliasearch(APPLICATION_ID, SEARCH_ONLY_API_KEY)
    var algoliaHelper = algoliasearchHelper(algolia, INDEX_NAME, PARAMS)
    algoliaHelper.setQueryParameter('getRankingInfo', true)

    // DOM and Templates binding
    var $map = $('#map')
    var $searchInput = $('#search-input')

    // Map initialization
    var map = new google.maps.Map($map.get(0), {
      streetViewControl: false,
      mapTypeControl: false,
      zoom: 4,
      minZoom: 3,
      maxZoom: 12,
      styles: [{ stylers: [{ hue: '#3596D2' }] }]
    })
    var fitMapToMarkersAutomatically = true
    var markers = []
    var boundingBox
    var boundingBoxListeners = []

    // Page states
    var PAGE_STATES = {
      LOAD: 0,
      BOUNDING_BOX_RECTANGLE: 1,
      BOUNDING_BOX_POLYGON: 2,
      AROUND_IP: 4,
      AROUND_NYC: 5,
      AROUND_LONDON: 6,
      AROUND_SYDNEY: 7
    }
    var pageState = PAGE_STATES.LOAD
    setPageState(PAGE_STATES.BOUNDING_BOX_RECTANGLE)

    // PAGE STATES
    // ===========
    function setPageState (state) {
      resetPageState()
      beginPageState(state)
    }

    function beginPageState (state) {
      pageState = state

      switch (state) {
        case PAGE_STATES.BOUNDING_BOX_RECTANGLE:
          boundingBox = new google.maps.Rectangle({
            bounds: { north: 60, south: 40, east: 16, west: -4 },
            strokeColor: '#EF5362',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#EF5362',
            fillOpacity: 0.15,
            draggable: true,
            editable: true,
            geodesic: true,
            map: map
          })
          algoliaHelper.setQueryParameter(
            'insideBoundingBox',
            rectangleToAlgoliaParams(boundingBox)
          )
          boundingBoxListeners.push(
            google.maps.event.addListener(
              boundingBox,
              'bounds_changed',
              throttle(rectangleBoundsChanged, 150)
            )
          )
          break

        case PAGE_STATES.BOUNDING_BOX_POLYGON:
          boundingBox = new google.maps.Polygon({
            paths: [
              { lat: 42.01, lng: -124.31 },
              { lat: 42.0, lng: -120.01 },
              { lat: 39.01, lng: -120.01 },
              { lat: 35.0, lng: -114.64 },
              { lat: 36.99, lng: -114.03 },
              { lat: 36.99, lng: -109.05 },
              { lat: 31.36, lng: -109.05 },
              { lat: 31.36, lng: -111.09 },
              { lat: 32.48, lng: -114.89 },
              { lat: 32.75, lng: -114.76 },
              { lat: 32.37, lng: -121.2 },
              { lat: 40.09, lng: -125.81 },
              { lat: 42.01, lng: -125.94 },
              { lat: 42.01, lng: -124.31 }
            ],
            strokeColor: '#EF5362',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#EF5362',
            fillOpacity: 0.15,
            draggable: true,
            editable: true,
            geodesic: true,
            map: map
          })
          algoliaHelper.setQueryParameter(
            'insidePolygon',
            polygonsToAlgoliaParams(boundingBox)
          )
          boundingBoxListeners.push(
            google.maps.event.addListener(
              boundingBox.getPath(),
              'set_at',
              throttle(polygonBoundsChanged, 150)
            )
          )
          boundingBoxListeners.push(
            google.maps.event.addListener(
              boundingBox.getPath(),
              'insert_at',
              throttle(polygonBoundsChanged, 150)
            )
          )
          break

        case PAGE_STATES.AROUND_IP:
          algoliaHelper.setQueryParameter('aroundLatLngViaIP', true)
          break

        case PAGE_STATES.AROUND_NYC:
          algoliaHelper.setQueryParameter('aroundLatLng', '40.71, -74.01')
          break

        case PAGE_STATES.AROUND_LONDON:
          algoliaHelper.setQueryParameter('aroundLatLng', '51.50, -0.13')
          break

        case PAGE_STATES.AROUND_SYDNEY:
          algoliaHelper.setQueryParameter('aroundLatLng', '-33.86, 151.20')
          break

        default:
        // No-op
      }

      fitMapToMarkersAutomatically = true
      algoliaHelper.search()
    }

    function resetPageState () {
      if (boundingBox) boundingBox.setMap(null)
      for (var i = 0; i < boundingBoxListeners.length; ++i) {
        google.maps.event.removeListener(boundingBoxListeners[i])
      }
      boundingBoxListeners = []
      $searchInput.val('')
      algoliaHelper.setQuery('')
      algoliaHelper.setQueryParameter('insideBoundingBox', undefined)
      algoliaHelper.setQueryParameter('insidePolygon', undefined)
      algoliaHelper.setQueryParameter('aroundLatLng', undefined)
      algoliaHelper.setQueryParameter('aroundLatLngViaIP', undefined)
    }

    // TEXTUAL SEARCH
    // ===============
    $searchInput.on('input propertychange', function (e) {
      var query = e.currentTarget.value
      if (
        pageState === PAGE_STATES.BOUNDING_BOX_RECTANGLE ||
        pageState === PAGE_STATES.BOUNDING_BOX_POLYGON
      ) {
        fitMapToMarkersAutomatically = false
      }
      algoliaHelper.setQuery(query).search()
    })

    // DISPLAY RESULTS
    // ===============
    algoliaHelper.on('result', content => {
      this.setState({ hits: content.hits.slice(0, 20) })
      renderMap(content)
    })

    algoliaHelper.on('error', function (error) {
      console.log(error)
    })

    function renderMap (content) {
      removeMarkersFromMap()
      markers = []

      for (var i = 0; i < content.hits.length; ++i) {
        var hit = content.hits[i]
        var marker = new google.maps.Marker({
          position: { lat: hit._geoloc.lat, lng: hit._geoloc.lng },
          map: map,
          airport_id: hit.objectID,
          title: hit.name + ' - ' + hit.city + ' - ' + hit.country
        })
        markers.push(marker)
        attachInfoWindow(marker, hit)
      }

      if (fitMapToMarkersAutomatically) fitMapToMarkers()
    }

    // EVENTS BINDING
    // ==============
    $('.change_page_state').on('click', function (e) {
      e.preventDefault()
      updateMenu($(this).data('state'), $(this).data('mode'))
      switch ($(this).data('state')) {
        case 'rectangle':
          setPageState(PAGE_STATES.BOUNDING_BOX_RECTANGLE)
          break
        case 'polygon':
          setPageState(PAGE_STATES.BOUNDING_BOX_POLYGON)
          break
        case 'ip':
          setPageState(PAGE_STATES.AROUND_IP)
          break
        case 'nyc':
          setPageState(PAGE_STATES.AROUND_NYC)
          break
        case 'london':
          setPageState(PAGE_STATES.AROUND_LONDON)
          break
        case 'sydney':
          setPageState(PAGE_STATES.AROUND_SYDNEY)
          break
        default:
        // No op
      }
    })

    // HELPER METHODS
    // ==============
    function updateMenu (stateClass, modeClass) {
      $('.change_page_state').removeClass('active')
      $('.change_page_state[data-state="' + stateClass + '"]').addClass(
        'active'
      )
      $('.page_mode').removeClass('active')
      $('.page_mode[data-mode="' + modeClass + '"]').addClass('active')
    }

    function fitMapToMarkers () {
      var mapBounds = new google.maps.LatLngBounds()
      for (var i = 0; i < markers.length; i++) {
        mapBounds.extend(markers[i].getPosition())
      }
      map.fitBounds(mapBounds)
    }

    function removeMarkersFromMap () {
      for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null)
      }
    }

    function rectangleBoundsChanged () {
      fitMapToMarkersAutomatically = false
      algoliaHelper
        .setQueryParameter(
          'insideBoundingBox',
          rectangleToAlgoliaParams(boundingBox)
        )
        .search()
    }
    function polygonBoundsChanged () {
      fitMapToMarkersAutomatically = false
      algoliaHelper
        .setQueryParameter(
          'insidePolygon',
          polygonsToAlgoliaParams(boundingBox)
        )
        .search()
    }

    function rectangleToAlgoliaParams (rectangle) {
      var bounds = rectangle.getBounds()
      var ne = bounds.getNorthEast()
      var sw = bounds.getSouthWest()
      return [ne.lat(), ne.lng(), sw.lat(), sw.lng()].join()
    }

    function polygonsToAlgoliaParams (polygons) {
      var points = []
      polygons.getPaths().forEach(function (path) {
        path.getArray().forEach(function (latLng) {
          points.push(latLng.lat())
          points.push(latLng.lng())
        })
      })
      return points.join()
    }

    function attachInfoWindow (marker, hit) {
      var message

      if (hit.name === hit.city) {
        message = hit.name + ' - ' + hit.country
      } else {
        message = hit.name + ' - ' + hit.city + ' - ' + hit.country
      }

      var infowindow = new google.maps.InfoWindow({ content: message })
      marker.addListener('click', function () {
        setTimeout(function () {
          infowindow.close()
        }, 3000)
      })
    }

    function throttle (func, wait) {
      var context
      var args
      var result
      var timeout = null
      var previous = 0
      function later () {
        previous = Date.now()
        timeout = null
        result = func.apply(context, args)
        if (!timeout) context = args = null
      }
      return function () {
        var now = Date.now()
        var remaining = wait - (now - previous)
        context = this
        args = arguments
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout)
            timeout = null
          }
          previous = now
          result = func.apply(context, args)
          if (!timeout) {
            context = args = null
          }
        } else if (!timeout) {
          timeout = setTimeout(later, remaining)
        }
        return result
      }
    }
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
            />
            {this.state.hits.length === 0 ? (
              <div id='no-results-message'>
                <p>We didn't find any airports in this location.</p>
              </div>
            ) : (
              <div id='hits'>
                {this.state.hits.map(hit => (
                  <Hit key={hit.iata_code} hit={hit} />
                ))}
              </div>
            )}
          </div>
          <div className='right-column'>
            <div id='map' />
          </div>

          <div className='clear-both' />
        </section>

        <Footer />
        <SimpleMap />
      </React.Fragment>
    )
  }
}
