# DATAGERRY - OpenSource Enterprise CMDB
# Copyright (C) 2019 NETHINKS GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.
from typing import Union, List

from cmdb.data_storage.database_manager import DatabaseManagerMongo
from cmdb.framework.results import IterationResult
from cmdb.framework.utils import PublicID
from cmdb.manager import ManagerGetError, ManagerDeleteError
from cmdb.user_management.models.settings import UserSettingModel, UserSettingType
from cmdb.user_management.managers.account_manager import AccountManager


class UserSettingsManager(AccountManager):
    """
    Manager for user settings CRUD functions.
    """

    def __init__(self, database_manager: DatabaseManagerMongo = None):
        """
        Constructor of `UserSettingsManager`
        Args:
            database_manager: Active database connection manager
        """
        super(UserSettingsManager, self).__init__(collection=UserSettingModel.COLLECTION,
                                                  database_manager=database_manager)

    def iterate(self, filter: dict, limit: int, skip: int, sort: str, order: int, *args, **kwargs) \
            -> IterationResult[UserSettingModel]:
        raise NotImplementedError(
            'Because only a restricted number of settings per user is possible, \
             a limitation and iteration of the query is not necessary.')

    def get_user_setting(self, user_id: int, identifier: str) -> UserSettingModel:
        """
        Get a single setting from a user by the identifier.

        Args:
            user_id (int): PublicID of the user.
            identifier (str): Name of the setting.

        Returns:
            UserSettingModel: Instance of UserSettingModel with data.
        """

        result = self._get(self.collection, filter={'user_id': user_id, 'identifier': identifier}, limit=1)
        for resource_result in result.limit(-1):
            return UserSettingModel.from_data(resource_result)
        raise ManagerGetError(f'No setting with the name: {identifier} was found!')

    def get_user_settings(self, user_id: PublicID, setting_type: UserSettingType = None) -> List[UserSettingModel]:
        """
        Get all settings from a user by the user_id.
        Args:
            user_id (int): PublicID of the user.
            setting_type(UserSettingType): Optional the type of user settings for filtering.

        Returns:
            - List of UserSettingModel.
        """
        query = {'user_id': user_id}
        if setting_type:
            query.update({'setting_type': setting_type.value})

        user_settings = self._get(self.collection, filter=query)
        return [UserSettingModel.from_data(setting) for setting in user_settings]

    def insert(self, setting: Union[dict, UserSettingModel], *args, **kwargs):
        """
        Insert a single setting into the database.

        Args:
            setting (Union[dict, UserSettingModel]): Raw data of the setting.
        """
        if isinstance(setting, UserSettingModel):
            setting = UserSettingModel.to_data(setting)
        return self._insert(self.collection, resource=setting, skip_public=True)

    def update(self, user_id: int, identifier: str, setting: Union[dict, UserSettingModel], *args, **kwargs):
        """
        Update a existing setting in the database.

        Args:
            setting (Union[dict, UserSettingModel]): Settings data.
            user_id (int): User of this setting.
            identifier (str): Identifier of the setting.

        Notes:
            If a `UserSettingModel` was passed as type argument, \
            it will be auto converted via the model `to_data` method.
        """
        if isinstance(setting, UserSettingModel):
            setting = UserSettingModel.to_dict(setting)
        return self._update(self.collection, filter={'identifier': identifier,
                                                     'user_id': user_id}, resource=setting)

    def delete(self, user_id: PublicID, identifier: str, *args, **kwargs):
        """
        Delete a existing setting by the tuple of user_id and identifier.

        Args:
            user_id (int): PublicID of the user in the database.
            identifier (str): Name/Identifier of the setting.

        Returns:
            UserSettingModel: The deleted setting as its model.
        """
        setting: UserSettingModel = self.get_user_setting(user_id=user_id, identifier=identifier)
        delete_result = self._delete(self.collection, filter={'user_id': user_id, 'identifier': identifier})

        if delete_result.deleted_count == 0:
            raise ManagerDeleteError(err='No user matched this public id')
        return setting