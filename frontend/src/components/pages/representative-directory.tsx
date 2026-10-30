'use client';
import type {PublicRepresentative} from '@/lib/public-representatives';
import {IranRepresentativesMap} from './iran-representatives-map';

export function RepresentativeDirectory({items,dataAvailable=true}:{items:PublicRepresentative[];dataAvailable?:boolean}){
  return <IranRepresentativesMap items={items} dataAvailable={dataAvailable} selectedProvince="" onProvinceChange={()=>undefined}/>;
}
