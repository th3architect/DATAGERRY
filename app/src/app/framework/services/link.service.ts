/*
* DATAGERRY - OpenSource Enterprise CMDB
* Copyright (C) 2019 NETHINKS GmbH
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.

* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiCallService, ApiService, httpObserveOptions } from '../../services/api-call.service';
import { CmdbLink } from '../models/cmdb-link';
import { HttpParams } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class LinkService<T = CmdbLink> implements ApiService {
  public servicePrefix: string = 'object/link';

  constructor(private api: ApiCallService) {
  }

  public getPartnerID(id: number, link: CmdbLink): number {
    return id === link.primary ? link.secondary : link.primary;
  }

  public getLinks(publicID: number): Observable<T[]> {
    const options = httpObserveOptions;
    options.params = new HttpParams();
    return this.api.callGet<T[]>(`${ this.servicePrefix }/${ publicID }/`, options).pipe(
      map((apiResponse) => {
        return apiResponse.body;
      })
    );
  }

  public getLinksByPartner(publicID: number): Observable<T[]> {
    const options = httpObserveOptions;
    options.params = new HttpParams();
    return this.api.callGet<T[]>(`${ this.servicePrefix }/partner/${ publicID }/`, options).pipe(
      map((apiResponse) => {
        if (apiResponse.status === 204) {
          return [];
        }
        return apiResponse.body;
      })
    );
  }

  public postLink(data: CmdbLink): Observable<any> {
    const options = httpObserveOptions;
    options.params = new HttpParams();
    return this.api.callPost<CmdbLink>(`${ this.servicePrefix }/`, data, options).pipe(
      map((apiResponse) => {
        return apiResponse.body;
      })
    );
  }

  public deleteLink(publicID: number): Observable<any> {
    const options = httpObserveOptions;
    options.params = new HttpParams();
    return this.api.callDelete<number>(`${ this.servicePrefix }/${ publicID }`, options).pipe(
      map((apiResponse) => {
        return apiResponse.body;
      })
    );
  }


}
