from cmdb.utils.logger import get_logger
from cmdb.utils.system_reader import SystemReader, SystemConfigReader, SystemSettingsReader
from cmdb.utils.system_writer import SystemSettingsWriter
from cmdb.utils.security import SecurityManager


def get_security_manager(database_manager) -> SecurityManager:
    return SecurityManager(database_manager)


def get_system_config_reader() -> SystemConfigReader:
    """
    get a instance of the configuration file reader
    Returns:
        (SystemConfigReader): instance of SystemConfigReader

    """
    return SystemConfigReader(
        config_name=SystemConfigReader.DEFAULT_CONFIG_NAME,
        config_location=SystemConfigReader.DEFAULT_CONFIG_LOCATION
    )


def get_system_settings_writer(database_manager) -> SystemSettingsWriter:
    """
    get a instance of the database settings writer
    Args:
        database_manager (DatabaseManager): instance of the database manager

    Returns:
        (SystemSettingsWriter): instance of SystemSettingsWriter
    """
    return SystemSettingsWriter(
        database_manager=database_manager
    )


def get_system_settings_reader(database_manager) -> SystemSettingsReader:
    """
    get a instance of the database settings reader
    Args:
        database_manager (DatabaseManager): instance of the database manager

    Returns:
        (SystemSettingsReader): instance of SystemSettingsReader
    """
    return SystemSettingsReader(
        database_manager=database_manager
    )