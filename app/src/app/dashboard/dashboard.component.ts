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

import * as moment from 'moment';

import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ApiCallService } from '../services/api-call.service';
import { TypeService } from '../framework/services/type.service';
import { ObjectService } from '../framework/services/object.service';
import { CmdbCategory } from '../framework/models/cmdb-category';
import { CategoryService } from '../framework/services/category.service';
import { GroupService } from '../management/services/group.service';
import { Group } from '../management/models/group';
import { UserService } from '../management/services/user.service';
import { User } from '../management/models/user';
import { APIGetMultiResponse } from '../services/models/api-response';
import { SpecialService } from '../framework/services/special.service';
import { RenderResult } from '../framework/models/cmdb-render';
import { Column } from '../layout/table/table.types';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { ToastService } from '../layout/toast/toast.service';
import { SidebarService } from '../layout/services/sidebar.service';
import { CollectionParameters } from '../services/models/api-parameter';
import { CmdbType } from '../framework/models/cmdb-type';
import { HttpResponse } from '@angular/common/http';


@Component({
  selector: 'cmdb-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  @ViewChild('activeTemplate', { static: true }) activeTemplate: TemplateRef<any>;
  @ViewChild('userTemplate', { static: true }) userTemplate: TemplateRef<any>;
  @ViewChild('actionTemplate', { static: true }) actionTemplate: TemplateRef<any>;

  /**
   * Global unsubscriber for http calls to the rest backend.
   */
  private unSubscribe: ReplaySubject<void> = new ReplaySubject();

  public objectCount: number;
  public typeCount: number;
  public userCount: number;

  public readonly maxChartValue: number = 4;

  // Chart Objects
  public labelsObject: string [] = [];
  public itemsObject: number [] = [];
  public colorsObject: any [] = [];
  public optionsObject: {} = {};

  // Chart Types
  public labelsCategory: string [] = [];
  public itemsCategory: number [] = [];
  public colorsCategory: any [] = [];

  // Chart Users
  public labelsGroup: string [] = [];
  public itemsGroup: number [] = [];
  public colorsGroup: any [] = [];

  public newestObjects: Array<RenderResult>;
  public newestTableColumns: Array<Column>;
  public newestObjectsCount: number;

  public latestObjects: Array<RenderResult>;
  public latestTableColumns: Array<Column>;
  public latestObjectsCount: number;

  constructor(private api: ApiCallService, private typeService: TypeService,
              private objectService: ObjectService, private categoryService: CategoryService,
              private toastService: ToastService, private sidebarService: SidebarService,
              private userService: UserService, private groupService: GroupService,
              private specialService: SpecialService<RenderResult>) {
  }

  public ngOnInit(): void {

    const activeColumn = {
      display: 'Active',
      name: 'active',
      data: 'object_information.active',
      searchable: false,
      sortable: false,
      template: this.activeTemplate,
      cssClasses: ['text-center'],
      style: { width: '6rem' }
    } as unknown as Column;

    const publicColumn = {
      display: 'Public ID',
      name: 'public_id',
      data: 'object_information.object_id',
      cssClasses: ['text-center'],
      style: { width: '6rem' },
      searchable: false,
      sortable: false
    } as unknown as Column;

    const typeColumn = {
      display: 'Type',
      name: 'type',
      data: 'type_information.type_label',
      cssClasses: ['text-center'],
      searchable: false,
      sortable: false
    } as unknown as Column;

    const authorColumn = {
      display: 'Author',
      name: 'author_id',
      data: 'object_information.author_name',
      sortable: false,
      searchable: false,
      cssClasses: ['text-center']
    } as Column;

    const editorColumn = {
      display: 'Last editor',
      name: 'editor_id',
      data: 'object_information.editor_name',
      sortable: false,
      searchable: false,
      cssClasses: ['text-center'],
      render(data: any) {
        if (!data) {
          return '';
        }
        return data;
      }
    } as Column;

    const creationColumn = {
      display: 'Creation Time',
      name: 'creation_time',
      data: 'object_information.creation_time',
      sortable: false,
      searchable: false,
      cssClasses: ['text-center'],
      render(data: any, item?: any, column?: Column, index?: number) {
        return moment(new Date(data.$date)).format('DD/MM/YYYY - HH:mm:ss');
      }
    } as Column;

    const lastModColumn = {
      display: 'Modification Time',
      name: 'last_edit_time',
      data: 'object_information.last_edit_time',
      sortable: false,
      searchable: false,
      cssClasses: ['text-center'],
      render(data: any, item?: any, column?: Column, index?: number) {
        if (!data) {
          return 'No modifications so far.';
        }
        return moment(new Date(data.$date)).format('DD/MM/YYYY - HH:mm:ss');
      }
    } as Column;

    const actionColumn = {
      display: 'Actions',
      name: 'actions',
      sortable: false,
      searchable: false,
      fixed: true,
      template: this.actionTemplate,
      cssClasses: ['text-center'],
      style: { width: '6em' }
    } as unknown as Column;
    this.newestTableColumns = [activeColumn, publicColumn, typeColumn, authorColumn, creationColumn, actionColumn];
    this.latestTableColumns = [activeColumn, publicColumn, typeColumn, editorColumn, lastModColumn, actionColumn];

    this.countTypes();
    this.countObjects();

    this.userService.countUsers().subscribe((totals: any) => {
      this.userCount = totals;
    });

    this.loadNewstObjects();
    this.loadLatestObjects();

    this.generateObjectChar();
    this.generateTypeChar();
    this.generateGroupChar();
  }

  private countObjects(): void {
    const apiParameters: CollectionParameters = { limit: 5, sort: 'count', order: -1, page: 1,
      filter: [{ $match: { } }]};
    this.objectService.getObjects(apiParameters).pipe(takeUntil(this.unSubscribe))
      .subscribe((apiResponse: HttpResponse<APIGetMultiResponse<RenderResult>>) => {
        this.objectCount = apiResponse.body.total;
      });
  }

  private countTypes(): void {
    const filter = JSON.stringify(this.typeService.getAclFilter());
    const apiParameters: CollectionParameters = { page: 1, limit: 1, sort: 'public_id', order: 1, filter};
    this.typeService.getTypes(apiParameters).pipe(takeUntil(this.unSubscribe))
      .subscribe((response: APIGetMultiResponse<CmdbType>) => {
        this.typeCount = response.total;
      });
  }

  private loadNewstObjects(): void {
    this.specialService.getNewestObjects().subscribe((results: Array<RenderResult>) => {
      this.newestObjects = results;
      this.newestObjectsCount = results.length;
    });
  }

  private loadLatestObjects(): void {
    this.specialService.getLatestObjects().subscribe((results: Array<RenderResult>) => {
      this.latestObjects = results;
      this.latestObjectsCount = results.length;
    });
  }

  private generateObjectChar() {
    this.optionsObject = {
      responsive: true,
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      },
    };
    this.objectService.groupObjectsByType('type_id').subscribe(values => {
      for (const obj of values) {
        this.labelsObject.push(obj.label);
        this.colorsObject.push(this.getRandomColor());
        this.itemsObject.push(obj.count);
      }
    });
  }

  private generateTypeChar() {

    this.categoryService.getCategoryList().subscribe((data: CmdbCategory[]) => {
      for (let i = 0; i < data.length; i++) {
        this.typeService.getTypeListByCategory(data[i].public_id).pipe(
          takeUntil(this.unSubscribe)).subscribe((list: any[]) => {
            this.itemsCategory.push(list.length);
            this.labelsCategory.push(data[i].label);
            this.colorsCategory.push(this.getRandomColor());
        });
        if (i === this.maxChartValue) {
          break;
        }
      }
    });
  }

  private generateGroupChar() {
    let values;
    this.groupService.getGroups().subscribe((data: APIGetMultiResponse<Group>) => {
        values = data.results;
      }, () => {
      },
      () => {
        for (let i = 0; i < values.length; i++) {
          this.userService.getUsersByGroup(values[i].public_id).pipe(takeUntil(this.unSubscribe)).subscribe((users: User[]) => {
            this.labelsGroup.push(values[i].label);
            this.colorsGroup.push(this.getRandomColor());
            this.itemsGroup.push(users.length);
          });
          if (i === this.maxChartValue) {
            break;
          }
        }

      });
  }

  getRandomColor() {
    const color = Math.floor(0x1000000 * Math.random()).toString(16);
    return '#' + ('000000' + color).slice(-6);
  }

  public onObjectDelete(value: RenderResult) {
    this.objectService.deleteObject(value.object_information.object_id).pipe(takeUntil(this.unSubscribe))
      .subscribe(() => {
          this.toastService.success(`Object ${ value.object_information.object_id } was deleted successfully`);
          this.sidebarService.updateTypeCounter(value.type_information.type_id).then(() => {
              this.loadLatestObjects();
              this.loadNewstObjects();
            }
          );
        },
        (error) => {
          this.toastService.error(`Error while deleting object ${ value.object_information.object_id } | Error: ${ error }`);
        });
  }

  public ngOnDestroy(): void {
    this.unSubscribe.next();
    this.unSubscribe.complete();
  }
}
