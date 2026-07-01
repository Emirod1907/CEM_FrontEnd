import axios from './axios'

export const getRolesRequest = () =>
    axios.get('admin/roles', { withCredentials: true });

export const getPermisosRequest = () =>
    axios.get('admin/permisos', { withCredentials: true });

export const updateRolPermisosRequest = (rolId, permisoIds) =>
    axios.put(`admin/roles/${rolId}/permisos`, { permiso_ids: permisoIds }, { withCredentials: true });
