/*
* dataGerry - OpenSource Enterprise CMDB
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

import { Component, OnInit } from '@angular/core';
import { ApiCallService } from '../../../services/api-call.service';
import { ObjectService } from '../../services/object.service';
import { TypeService } from '../../services/type.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CmdbMode } from '../../modes.enum';
import { CmdbObject } from '../../models/cmdb-object';
import { CmdbType } from '../../models/cmdb-type';
import {FormControl, FormGroup} from '@angular/forms';
import {UserService} from '../../../user/services/user.service';

@Component({
  selector: 'cmdb-object-copy',
  templateUrl: './object-copy.component.html',
  styleUrls: ['./object-copy.component.scss']
})
export class ObjectCopyComponent implements OnInit {

  public mode: CmdbMode = CmdbMode.Edit;
  private objectID: number;
  public objectInstance: CmdbObject;
  public typeInstance: CmdbType;
  public renderForm: FormGroup;

  constructor(private api: ApiCallService, private objectService: ObjectService, private typeService: TypeService,
              private route: ActivatedRoute, private router: Router, private userService: UserService) {
    this.route.params.subscribe((params) => {
      this.objectID = params.publicID;
    });
    this.renderForm = new FormGroup({
      active: new FormControl( false)
    });
  }

  public ngOnInit(): void {
    this.objectService.getObject(this.objectID, true).subscribe((objectInstanceResp: CmdbObject) => {
      this.objectInstance = objectInstanceResp;
      this.renderForm.get('active').setValue(objectInstanceResp.active);
    }, (error) => {
      console.error(error);
    }, () => {
      this.typeService.getType(this.objectInstance.type_id).subscribe((typeInstanceResp: CmdbType) => {
        this.typeInstance = typeInstanceResp;
      });
    });
  }

  public copyObject(): void {
    this.renderForm.markAllAsTouched();
    if (this.renderForm.valid) {
      const newObjectInstance = new CmdbObject();
      newObjectInstance.type_id = this.objectInstance.type_id;
      newObjectInstance.active = this.renderForm.get('active').value;
      newObjectInstance.version = '1.0.0';
      newObjectInstance.author_id = this.userService.getCurrentUser().public_id;
      newObjectInstance.fields = [];
      this.renderForm.removeControl('active');
      Object.keys(this.renderForm.controls).forEach(field => {
        newObjectInstance.fields.push({
          name: field,
          value: this.renderForm.get(field).value
        });
      });
      let ack = null;
      this.objectService.postObject(newObjectInstance).subscribe(newObjectID => {
          ack = newObjectID;
        },
        (e) => {
          console.error(e);
        }, () => {
          this.router.navigate(['/framework/object/' + ack]);
        });
    }
  }
}