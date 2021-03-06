/*
* DATAGERRY - OpenSource Enterprise CMDB
* Copyright (C) 2019 - 2020 NETHINKS GmbH
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
* along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { TypeService } from '../services/type.service';
import { ReplaySubject } from 'rxjs';
import { APIGetMultiResponse } from '../../services/models/api-response';
import { CmdbType } from '../models/cmdb-type';
import { FileSaverService } from 'ngx-filesaver';
import { DatePipe } from '@angular/common';
import { FileService } from '../../export/export.service';
import { Column, Sort, SortDirection } from '../../layout/table/table.types';
import { CollectionParameters } from '../../services/models/api-parameter';
import { takeUntil } from 'rxjs/operators';
import { PermissionService } from '../../auth/services/permission.service';

@Component({
  selector: 'cmdb-type',
  templateUrl: './type.component.html',
  styleUrls: ['./type.component.scss']
})
export class TypeComponent implements OnInit, OnDestroy {

  /**
   * Global un-subscriber for http calls to the rest backend.
   */
  private subscriber: ReplaySubject<void> = new ReplaySubject<void>();

  /**
   * Info message.
   */
  public readonly INFO_MESSAGE: string = '' +
    'DATAGERRY is an asset management tool (or CMDB), where you can define the data model for your own.\n' +
    '\n' +
    'In DATAGERRY objects are stored. An object can be for example a router, server, location or maintenance contract and\n' +
    ' consists of multiple fields (e.g. management IP, hostname, … of a router). Each field has a specific data type.\n' +
    ' A datatype could be for example text, checkbox, date, dropdown or many more. The blueprint for an object is defined\n' +
    ' in an object type.';

  /**
   * Current category collection
   */
  public types: Array<CmdbType> = [];
  public typesAPIResponse: APIGetMultiResponse<CmdbType>;
  public totalTypes: number = 0;

  /**
   * Type selection.
   */
  public selectedTypes: Array<CmdbType> = [];
  public selectedTypeIDs: Array<number> = [];

  /**
   * Table Template: active column.
   */
  @ViewChild('activeTemplate', { static: true }) activeTemplate: TemplateRef<any>;

  /**
   * Table Template: Type name column.
   */
  @ViewChild('typeNameTemplate', { static: true }) typeNameTemplate: TemplateRef<any>;

  /**
   * Table Template: Type actions column.
   */
  @ViewChild('actionsTemplate', { static: true }) actionsTemplate: TemplateRef<any>;

  /**
   * Table Template: Type clean column.
   */
  @ViewChild('cleanTemplate', { static: true }) cleanTemplate: TemplateRef<any>;

  /**
   * Table columns definition.
   */
  public columns: Array<Column>;

  /**
   * Table selection enabled.
   */
  public selectEnabled: boolean = false;

  /**
   * Begin with first page.
   */
  public readonly initPage: number = 1;
  public page: number = this.initPage;

  /**
   * Max number of types per site.
   * @private
   */
  private readonly initLimit: number = 10;
  public limit: number = this.initLimit;

  /**
   * Filter query from the table search input.
   */
  public filter: string;

  /**
   * Default sort filter.
   */
  public sort: Sort = { name: 'public_id', order: SortDirection.DESCENDING } as Sort;

  /**
   * Loading indicator.
   */
  public loading: boolean = false;


  constructor(private typeService: TypeService, private fileService: FileService,
              private permissionService: PermissionService, private fileSaverService: FileSaverService,
              private datePipe: DatePipe) {
  }

  /**
   * Starts the component and init the table
   */
  public ngOnInit(): void {
    this.columns = [
      {
        display: 'Active',
        name: 'active',
        data: 'active',
        searchable: false,
        sortable: true,
        template: this.activeTemplate,
        cssClasses: ['text-center'],
        style: { width: '6rem' }
      },
      {
        display: 'Public ID',
        name: 'public_id',
        data: 'public_id',
        searchable: true,
        sortable: true
      },
      {
        display: 'Type',
        name: 'name',
        data: 'name',
        searchable: true,
        sortable: true,
        template: this.typeNameTemplate,
      },
      {
        display: 'Creation Time',
        name: 'creation_time',
        data: 'creation_time',
        sortable: true,
        searchable: false,
        render(data: any) {
          const date = new Date(data);
          return new DatePipe('en-US').transform(date, 'dd/MM/yyyy - hh:mm:ss').toString();
        }
      },
      {
        display: 'Actions',
        name: 'actions',
        searchable: false,
        sortable: false,
        fixed: true,
        template: this.actionsTemplate,
        cssClasses: ['text-center'],
        cellClasses: ['actions-buttons']
      },

    ] as Array<Column>;
    const cleanRight = 'base.framework.type.clean';
    if (this.permissionService.hasRight(cleanRight) || this.permissionService.hasExtendedRight(cleanRight)) {
      this.columns.push({
        display: 'Clean',
        name: 'clean',
        searchable: false,
        sortable: false,
        fixed: true,
        template: this.cleanTemplate,
        cssClasses: ['text-center'],
        cellClasses: ['text-center']
      } as Column);
    }
    const exportRight = 'base.export.type.*';
    if (this.permissionService.hasRight(exportRight) || this.permissionService.hasExtendedRight(exportRight)) {
      this.selectEnabled = true;
    }
    this.loadTypesFromAPI();
  }

  /**
   * Load/reload types from the api.
   * @private
   */
  private loadTypesFromAPI(): void {
    this.loading = true;
    let query;
    if (this.filter) {
      query = [];
      const or = [];
      const searchableColumns = this.columns.filter(c => c.searchable);
      // Searchable Columns
      for (const column of searchableColumns) {
        const regex: any = {};
        regex[column.name] = {
          $regex: String(this.filter),
          $options: 'ismx'
        };
        or.push(regex);
      }
      query.push({
        $addFields: {
          public_id: { $toString: '$public_id' }
        }
      });
      or.push({
        public_id: {
          $elemMatch: {
            value: {
              $regex: String(this.filter),
              $options: 'ismx'
            }
          }
        }
      });
      query.push({ $match: { $or: or } });
    }
    const params: CollectionParameters = {
      filter: query, limit: this.limit,
      sort: this.sort.name, order: this.sort.order, page: this.page
    };
    this.typeService.getTypes(params).pipe(takeUntil(this.subscriber)).subscribe(
      (apiResponse: APIGetMultiResponse<CmdbType>) => {
        this.typesAPIResponse = apiResponse;
        this.types = apiResponse.results as Array<CmdbType>;
        this.totalTypes = apiResponse.total;
        this.loading = false;
      });
  }

  /**
   * Destroy subscriptions after closed.
   */
  public ngOnDestroy(): void {
    this.subscriber.next();
    this.subscriber.complete();
  }

  /**
   * On table sort change.
   * Reload all types.
   *
   * @param sort
   */
  public onSortChange(sort: Sort): void {
    this.sort = sort;
    this.loadTypesFromAPI();
  }

  /**
   * On table selection change.
   * Map selected items by the object id
   *
   * @param selectedItems
   */
  public onSelectedChange(selectedItems: Array<CmdbType>): void {
    this.selectedTypes = selectedItems;
    this.selectedTypeIDs = selectedItems.map(t => t.public_id);
  }

  /**
   * On table page change.
   * Reload all types.
   *
   * @param page
   */
  public onPageChange(page: number) {
    this.page = page;
    this.loadTypesFromAPI();
  }

  /**
   * On table page size change.
   * Reload all types.
   *
   * @param limit
   */
  public onPageSizeChange(limit: number): void {
    this.limit = limit;
    this.loadTypesFromAPI();
  }

  /**
   * On table search change.
   * Reload all types.
   *
   * @param search
   */
  public onSearchChange(search: any): void {
    if (search) {
      this.filter = search;
    } else {
      this.filter = undefined;
    }
    this.loadTypesFromAPI();
  }

  /**
   * Download the selected export file
   *
   * @param data Data which will be exported
   * @param exportType File extension
   */
  public downLoadFile(data: any, exportType: any) {
    const timestamp = this.datePipe.transform(new Date(), 'MM_dd_yyyy_hh_mm_ss');
    this.fileSaverService.save(data.body, timestamp + '.' + exportType);
  }

  /**
   * Call the export routes with the selected types
   */
  public exportingFiles() {
    if (this.selectedTypeIDs.length === 0 || this.selectedTypeIDs.length === this.totalTypes) {
      this.fileService.getTypeFile()
        .subscribe(res => this.downLoadFile(res, 'json'));
    } else {
      this.fileService.callExportTypeRoute('/export/type/' + this.selectedTypeIDs.toString())
        .subscribe(res => this.downLoadFile(res, 'json'));
    }
  }

  /**
   * Quick-hack to open the selection box.
   */
  public showAlert(): void {
    $('#infobox').show();
  }

}
