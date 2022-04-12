import { NavNode } from 'common-experience-client';
import { createContext, useContext, useState } from 'react';

export interface CourseProps {
  course: {
    courseName: string;
    startDate: string;
    endDate: string;
    workspaceId: string;
    navigations: {
      'learning-plan': string;
      'learning-path': string;
      'resources-teacher': string;
      'resources-student': string;
    };
    districtSettings: {
      nweaEnabled: boolean;
      nweaBid?: string;
      ltiEnabled: boolean;
    };
  };
  features?: string[];
  teacherNDF?: {
    data: NavNode[];
    active?: NavNode;
  };
  studentNDF?: {
    data: NavNode[];
    active?: NavNode;
  };
}

export interface CourseProviderValue {
  courseState: CourseProps;
  setCourseState: (courseState: CourseProps) => void;
}

const defaultCourseProps = {
  course: {
    courseName: 'default test course',
    startDate: '0',
    endDate: '0',
    workspaceId: '1',
    navigations: {
      'learning-plan': '',
      'learning-path': '',
      'resources-teacher': '',
      'resources-student': '',
    },
    districtSettings: {
      nweaEnabled: false,
      ltiEnabled: true,
    },
  },
};

const CourseContext = createContext<CourseProviderValue | undefined>(undefined);

const CourseProvider: React.FC = ({ children }) => {
  const [courseState, setCourseState] = useState(defaultCourseProps);

  /* 
        TODO:  MTS-12347 call getCourseInfo and to update get courseCGI from Auth
        should contain two types of NavNodes if you are a teacher.  Will need to 
        also grab the student NDF as a teacher
    */

  return <CourseContext.Provider value={{ courseState, setCourseState }}>{children}</CourseContext.Provider>;
};

const useCourseContext: React.ReactNode = () => {
  const context = useContext(CourseContext);

  if (context === undefined) {
    throw new Error('unacceptable use of context outside of provider');
  }

  return context;
};

export { CourseContext, CourseProvider, useCourseContext };
