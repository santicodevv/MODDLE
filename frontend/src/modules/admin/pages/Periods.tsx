import { useAdminPeriods } from '../hooks/useAdminPeriods';
import { PeriodsHeader } from '../components/periods/PeriodsHeader';
import { PeriodCreateForm } from '../components/periods/PeriodCreateForm';
import { PeriodListView } from '../components/periods/PeriodListView';
import { PeriodDetailView } from '../components/periods/PeriodDetailView';
import { PeriodCoursesView } from '../components/periods/PeriodCoursesView';
import { PeriodEditModal } from '../components/periods/PeriodEditModal';

export default function AdminPeriods() {
  const {
    viewMode,
    setViewMode,
    selectedPeriod,
    setSelectedPeriod,
    showCreateForm,
    setShowCreateForm,
    showReenrolmentConfig,
    setShowReenrolmentConfig,
    courseSearch,
    setCourseSearch,
    showEditForm,
    setShowEditForm,
    editPeriodData,
    setEditPeriodData,
    newPeriod,
    setNewPeriod,
    reenrolmentConfig,
    setReenrolmentConfig,
    selectedCoursesToAdd,
    setSelectedCoursesToAdd,
    periods,
    loadingPeriods,
    availableCourses,
    loadingAvailableCourses,
    loadingMoodleCourses,
    createMutation,
    configReenrolmentMutation,
    openReenrolmentMutation,
    closeReenrolmentMutation,
    openPeriodMutation,
    closePeriodMutation,
    addCoursesMutation,
    removeCoursesMutation,
    toggleCourseMutation,
    updatePeriodMutation,
    deletePeriodMutation,
    handleSelectPeriod,
    handleAddCourses,
    coursesToShow,
  } = useAdminPeriods();

  return (
    <div>
      <PeriodsHeader
        viewMode={viewMode}
        showCreateForm={showCreateForm}
        setShowCreateForm={setShowCreateForm}
      />

      {showCreateForm && viewMode === 'list' && (
        <PeriodCreateForm
          newPeriod={newPeriod}
          setNewPeriod={setNewPeriod}
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(newPeriod);
          }}
          isPending={createMutation.isPending}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {viewMode === 'list' && (
        <PeriodListView
          periods={periods}
          loadingPeriods={loadingPeriods}
          handleSelectPeriod={handleSelectPeriod}
          setShowCreateForm={setShowCreateForm}
        />
      )}

      {viewMode === 'detail' && selectedPeriod && (
        <PeriodDetailView
          selectedPeriod={selectedPeriod}
          setViewMode={setViewMode}
          setSelectedPeriod={setSelectedPeriod}
          openPeriodMutation={openPeriodMutation}
          closePeriodMutation={closePeriodMutation}
          deletePeriodMutation={deletePeriodMutation}
          setEditPeriodData={setEditPeriodData}
          setShowEditForm={setShowEditForm}
          showReenrolmentConfig={showReenrolmentConfig}
          setShowReenrolmentConfig={setShowReenrolmentConfig}
          reenrolmentConfig={reenrolmentConfig}
          setReenrolmentConfig={setReenrolmentConfig}
          configReenrolmentMutation={configReenrolmentMutation}
          openReenrolmentMutation={openReenrolmentMutation}
          closeReenrolmentMutation={closeReenrolmentMutation}
        />
      )}

      {viewMode === 'courses' && selectedPeriod && (
        <PeriodCoursesView
          selectedPeriod={selectedPeriod}
          setViewMode={setViewMode}
          loadingAvailableCourses={loadingAvailableCourses}
          availableCourses={availableCourses}
          toggleCourseMutation={toggleCourseMutation}
          removeCoursesMutation={removeCoursesMutation}
          courseSearch={courseSearch}
          setCourseSearch={setCourseSearch}
          loadingMoodleCourses={loadingMoodleCourses}
          coursesToShow={coursesToShow}
          selectedCoursesToAdd={selectedCoursesToAdd}
          setSelectedCoursesToAdd={setSelectedCoursesToAdd}
          handleAddCourses={handleAddCourses}
          addCoursesMutation={addCoursesMutation}
        />
      )}

      <PeriodEditModal
        showEditForm={showEditForm}
        setShowEditForm={setShowEditForm}
        editPeriodData={editPeriodData}
        setEditPeriodData={setEditPeriodData}
        updatePeriodMutation={updatePeriodMutation}
      />
    </div>
  );
}
