import React from 'react'

export const Header = () => (
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
)
