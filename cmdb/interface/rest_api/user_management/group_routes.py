import logging

from cmdb.utils.interface_wraps import login_required, right_required
from cmdb.interface.route_utils import make_response, RootBlueprint
from cmdb.user_management.user_manager import user_manager

try:
    from cmdb.utils.error import CMDBError
except ImportError:
    CMDBError = Exception

LOGGER = logging.getLogger(__name__)
group_routes = RootBlueprint('group_rest', __name__, url_prefix='/group')


@group_routes.route('/', methods=['GET'])
@login_required
def get_all_groups():
    group_list = user_manager.get_all_groups()
    resp = make_response(group_list)
    return resp


@group_routes.route('/<int:public_id>', methods=['GET'])
@login_required
def get_group(public_id: int):
    group_instance = user_manager.get_group(public_id)
    resp = make_response(group_instance)
    return resp


@group_routes.route('/', methods=['POST'])
@login_required
@right_required('base.system.user.manage_groups')
def add_group():
    raise NotImplementedError


@group_routes.route('/<int:public_id>', methods=['PUT'])
@login_required
@right_required('base.system.user.manage_groups')
def edit_group(public_id: int):
    raise NotImplementedError


@group_routes.route('/<int:public_id>', methods=['DELETE'])
@login_required
@right_required('base.system.user.manage_groups')
def delete_group(public_id: int):
    raise NotImplementedError
