import React from 'react'
import capitalize from 'lodash.capitalize'
import algoliasearch from 'algoliasearch'
import algoliasearchHelper from 'algoliasearch-helper'
import styled, { injectGlobal } from 'styled-components'
import styledMap from 'styled-map'
import {
  withScriptjs,
  withGoogleMap,
  GoogleMap,
  Marker,
  Circle
} from 'react-google-maps'

injectGlobal`
  html, body {
    margin: 0;
  }

  * {
    -webkit-font-smoothing: antialiased;
  }
`

const grey = 'rgb(145, 165, 174)'
const darkerGrey = 'rgb(8, 55, 73)'

const FullScreen = styled.div`
  width: 100vw;
  height: 100vh;
`

const Layout = styled.div`
  display: flex;
  height: 100%;
`

const MainContent = styled.div`
  flex: 1;
  height: 100%;
`

const Panel = styled.div`
  width: 384px;
`

const Icon = styled.div`
  font-size: 24px;
  line-height: 24px;
  padding-top: 6px;
  margin-bottom: 6px;
  ${props => (props.color ? `color: ${props.color}` : '')};

  ${styledMap('name', {
    close: `
      &::before {
        content: '\\2573';
      }
    `,
    magnifyingGlass: `
      &::before {
        content: '\\1F50D';
      }
    `
  })};
`

const _SearchHeader = styled.div`
  align-items: center;
  color: ${grey};
  display: flex;
  font-size: 20px;
  height: 64px;
  justify-content: center;
  line-height: 20px;
  position: relative;

  .absolute {
    position: absolute;
    top: 25%;
    right: 24px;
  }
`
const SearchHeader = ({ onClick }) => (
  <_SearchHeader>
    Trouver un docteur
    <div className='absolute'>
      <Icon color={darkerGrey} name='close' onClick={onClick} />
    </div>
  </_SearchHeader>
)

const DoctorSearchWrapper = styled.div`
  position: relative;

  .absolute {
    position: absolute;
    top: 25%;
    left: 24px;
  }
`

const DoctorSearchInput = styled.input`
  border: none;
  box-shadow: 0px 1px 1px #eee, 0px -1px 1px #eee;
  font-size: 16px;
  height: 64px;
  outline: none;
  padding: 0 24px 0 64px;
  width: 100%;
`

const DoctorSearch = props => (
  <DoctorSearchWrapper>
    <div className='absolute'>
      <Icon name='magnifyingGlass' />
    </div>
    <DoctorSearchInput {...props} />
  </DoctorSearchWrapper>
)
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
        maxZoom: 20
      }}
    >
      {props.children}
    </GoogleMap>
  ))
)

const MyMapComponent = props => (
  <_MyMapComponent
    googleMapURL='//maps.googleapis.com/maps/api/js?key=AIzaSyBnDR4e5_qobPG6Vn_zjhc1vyOIooChZt8'
    loadingElement={<div style={{ height: '100%' }} />}
    containerElement={<div style={{ height: '100%' }} />}
    mapElement={<div style={{ height: '100%' }} />}
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
      <FullScreen>
        <Layout>
          <MainContent>
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
          </MainContent>
          <Panel>
            <SearchHeader />
            <DoctorSearch
              type='text'
              autoComplete='off'
              spellCheck='false'
              autoCorrect='off'
              placeholder='Nom / spécialtié (Généraliste, dentiste...)'
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
          </Panel>
        </Layout>
      </FullScreen>
    )
  }
}
