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

from cmdb.database.managers import DatabaseManagerMongo
from cmdb.framework.results.list import ListResult
from cmdb.manager.errors import ManagerGetError, ManagerDeleteError
from cmdb.manager import ManagerBase
from cmdb.framework.managers.error.framework_errors import FrameworkGetError, FrameworkNotFoundError, \
    FrameworkIterationError, FrameworkDeleteError, FrameworkUpdateError
from cmdb.framework.results.iteration import IterationResult
from cmdb.framework.utils import PublicID, Collection
from cmdb.search import Query, Pipeline
from cmdb.search.query.builder import Builder


class FrameworkQueryBuilder(Builder):
    """Query/Pipeline builder class for the framework managers"""

    def __init__(self):
        """Init a query or a pipeline to None"""
        self.query: Union[Query, Pipeline] = Pipeline([])
        super(FrameworkQueryBuilder, self).__init__()

    def __len__(self):
        """Get the length of the query"""
        return len(self.query)

    def clear(self):
        """`Delete` the query content"""
        self.query = None

    def build(self, filter: Union[List[dict], dict], limit: int, skip: int, sort: str, order: int, *args, **kwargs) -> \
            Union[Query, Pipeline]:
        """
        Converts the parameters from the call to a mongodb aggregation pipeline
        Args:
            filter: dict or list of dict query/queries which the elements have to match.
            limit: max number of documents to return.
            skip: number of documents to skip first.
            sort: sort field
            order: sort order
            *args:
            **kwargs:

        Returns:
            The `FrameworkQueryBuilder` query pipeline with the parameter contents.
        """
        self.clear()
        self.query = Pipeline([])

        if isinstance(filter, dict):
            self.query.append(self.match_(filter))
        elif isinstance(filter, list):
            for pipe in filter:
                self.query.append(pipe)

        if limit == 0:
            results_query = [self.skip_(limit)]
        else:
            results_query = [self.skip_(skip), self.limit_(limit)]

        self.query.append(self.sort_(sort=sort, order=order))
        self.query.append(self.facet_({
            'meta': [self.count_('total')],
            'results': results_query
        }))
        return self.query


class FrameworkManager(ManagerBase):
    """Framework managers implementation for all framework based CRUD operations."""

    def __init__(self, collection: Collection, database_manager: DatabaseManagerMongo):
        """
        Set the collection name and the database connection.
        Args:
            collection: Name of the database collection
            database_manager: Active database managers instance
        """
        self.collection: Collection = collection
        self.builder = FrameworkQueryBuilder()
        super(FrameworkManager, self).__init__(database_manager)

    def count(self, filter: dict, *args, **kwargs) -> int:
        raise NotImplementedError

    def iterate(self, filter: dict, limit: int, skip: int, sort: str, order: int, *args, **kwargs) -> IterationResult:
        raise NotImplementedError

    def find(self, filter: dict, *args, **kwargs) -> ListResult:
        raise NotImplementedError

    def get(self, public_id: PublicID) -> dict:
        raise NotImplementedError

    def insert(self, resource: dict) -> PublicID:
        raise NotImplementedError

    def update(self, public_id: PublicID, resource: dict):
        raise NotImplementedError

    def delete(self, public_id: PublicID):
        raise NotImplementedError
