import { ProfileMemory } from './ApplyWise';
import { useApp } from '../context/AppContext';

export default function Profile() {
  const { studentProfile, updateStudentProfile } = useApp();
  return (
    <div className="page">
      <ProfileMemory profile={studentProfile} onSave={updateStudentProfile} />
    </div>
  );
}
