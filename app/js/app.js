/* global Hogan, google */
import React from 'react'
import $ from 'jquery'
import algoliasearch from 'algoliasearch'
import algoliasearchHelper from 'algoliasearch-helper'

export class App extends React.Component {
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
    var $hits = $('#hits')
    var $searchInput = $('#search-input')
    var hitsTemplate = Hogan.compile($('#hits-template').text())
    var noResultsTemplate = Hogan.compile($('#no-results-template').text())

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
    algoliaHelper.on('result', function (content) {
      renderMap(content)
      renderHits(content)
    })

    algoliaHelper.on('error', function (error) {
      console.log(error)
    })

    function renderHits (content) {
      if (content.hits.length === 0) {
        $hits.html(noResultsTemplate.render())
        return
      }
      content.hits = content.hits.slice(0, 20)
      for (var i = 0; i < content.hits.length; ++i) {
        var hit = content.hits[i]
        hit.displayCity = hit.name === hit.city
        if (hit._rankingInfo.matchedGeoLocation) {
          hit.distance =
            parseInt(hit._rankingInfo.matchedGeoLocation.distance / 1000, 10) +
            ' km'
        }
      }
      $hits.html(hitsTemplate.render(content))
    }

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
        <header>
          <h1>Airports - Geo Search Demo</h1>
          <a
            href=''
            className='change_page_state page_mode mode_button active'
            data-mode='bounding'
            data-state='rectangle'
          >
            Bounding box
          </a>
          <a
            href=''
            className='change_page_state page_mode mode_button'
            data-mode='around'
            data-state='ip'
          >
            Around a location
          </a>

          <p className='page_mode active' data-mode='bounding'>
            A bounding box filters the scope of the results to a specified zone.<br />
            This zone can be
            <a
              href=''
              className='change_page_state state_link active'
              data-mode='bounding'
              data-state='rectangle'
            >
              a rectangle
            </a>, or a
            <a
              href=''
              className='change_page_state state_link'
              data-mode='bounding'
              data-state='polygon'
            >
              a polygon
            </a>.
          </p>
          <p className='page_mode' data-mode='around'>
            Searching around a location can also rank the results by distance.<br />
            It can be done via the
            <a
              href=''
              className='change_page_state state_link'
              data-mode='around'
              data-state='ip'
            >
              IP address
            </a>, or by providing the lat/lng of a point:
            <a
              href=''
              className='change_page_state state_link'
              data-mode='around'
              data-state='nyc'
            >
              NYC
            </a>,
            <a
              href=''
              className='change_page_state state_link'
              data-mode='around'
              data-state='london'
            >
              London
            </a>,
            <a
              href=''
              className='change_page_state state_link'
              data-mode='around'
              data-state='sydney'
            >
              Sydney
            </a>...
          </p>
        </header>

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
            <div id='hits' />
          </div>

          <div className='right-column'>
            <div id='map' />
          </div>

          <div className='clear-both' />
        </section>

        <footer>
          Geo-Search demo - Read the{' '}
          <a href='https://www.algolia.com/doc/geo-search/geo-search-overview'>
            guide
          </a>{' '}
          - Source Code on{' '}
          <a href='https://github.com/algolia/demo-geo-search'>GitHub</a> -
          Powered by <a href='http://www.algolia.com/'>Algolia</a>
        </footer>
      </React.Fragment>
    )
  }
}
