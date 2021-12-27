import React from 'react';
import MarketCarousel from '../components/MarketCarousel';
import MarketsList from '../components/MarketsList';

export default function markets() {
  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-12">
            <MarketCarousel />
          </div>
        </div>
      </div>
      <MarketsList />
    </>
  );
}
