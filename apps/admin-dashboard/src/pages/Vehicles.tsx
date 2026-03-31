import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header, Card, LoadingSpinner } from '../components/common';
import { fleetApi } from '../services/api/fleet.api';
import { queryKeys } from '../services/query-keys';
import { Plus, Edit2, Trash2, Bus } from 'lucide-react';
import type { Vehicle, VehicleStatus } from '../types';

const Vehicles: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({ licensePlate: '', status: 'ACTIVE' as VehicleStatus });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: queryKeys.vehicles.all,
    queryFn: () => fleetApi.getAllVehicles(),
  });

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({ licensePlate: vehicle.licensePlate, status: vehicle.status });
    } else {
      setEditingVehicle(null);
      setFormData({ licensePlate: '', status: 'ACTIVE' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await fleetApi.updateVehicle(editingVehicle.id, formData);
      } else {
        // Hardcoding schoolId for demonstration as context isn't fully available
        await fleetApi.createVehicle({ ...formData, schoolId: 's1' });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await fleetApi.deleteVehicle(id);
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      } catch (error) {
        console.error('Error deleting vehicle:', error);
      }
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading fleet..." size="lg" />;
  }

  return (
    <>
      <Header
        title="Fleet Management"
        subtitle={`${vehicles.length} vehicles registered`}
        action={
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
            <Plus size={20} /> Add Vehicle
          </button>
        }
      />

      <div className="p-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dashboard-border text-slate-400 text-sm">
                  <th className="pb-4 pt-2 font-medium">Vehicle</th>
                  <th className="pb-4 pt-2 font-medium">License Plate</th>
                  <th className="pb-4 pt-2 font-medium">Status</th>
                  <th className="pb-4 pt-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashboard-border">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-primary-400">
                          <Bus size={20} />
                        </div>
                        <span className="font-medium text-white">
                          Bus #{vehicle.id.slice(0, 4)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-slate-300 font-mono">{vehicle.licensePlate}</td>
                    <td className="py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vehicle.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(vehicle)}
                          className="p-2 text-slate-400 hover:text-primary-400 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl border-primary-500/20">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  License Plate
                </label>
                <input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  className="w-full bg-slate-800 border-dashboard-border rounded-lg text-white p-2.5 focus:border-primary-500 outline-none transition-colors"
                  placeholder="e.g. BUS-101"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as VehicleStatus })
                  }
                  className="w-full bg-slate-800 border-dashboard-border rounded-lg text-white p-2.5 focus:border-primary-500 outline-none transition-colors"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingVehicle ? 'Update Vehicle' : 'Create Vehicle'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
};

export default Vehicles;
