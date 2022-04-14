import { Container, Heading, TypographyVisualStyle, Paragraph, Hyperlink } from 'react-magma-dom';
import Link from 'next/link';
import { Enrollment, AuthenticationResponse, UserService } from 'common-experience-client';
import { useState } from 'react';

export interface ClassListProps {
  userData: AuthenticationResponse;
}

export const isErrorResp = (arg: any): arg is Error => {
  if (typeof arg === 'object') {
    return typeof arg.statusText === 'string' && typeof arg.status === 'number';
  }
  return false;
};

const ClassList: React.FC<ClassListProps> = ({ userData }) => {
  const [networkError, setNetworklError] = useState({ error: false, message: '' });
  const buildHref = (course: Enrollment) => {
    return `/?token=${userData.token}&eISBN=${course.eisbn}&courseKey=${course.courseKey}`;
  };

  try {
    const res = UserService.getUserProfile(userData.courses[0].courseKey, userData.guid);
    /*if (res.status === 'failure') {
      throw new Error(res.reason);
    }*/

    /*if (res.token) {
      const userData = {
        ...res,
        courses: res.courses.sort((courseA: Enrollment, courseB: Enrollment) => {
          return courseA.title.localeCompare(courseB.title, undefined, {
            numeric: true,
          });
        }),
      };
      setUserData(userData);
    }*/

    console.log(res)
  } catch (error) {
    let errMessage = 'Service Error';
    if (error instanceof Error ){//|| axios.isAxiosError(error)) {
      errMessage = error.message;
    } else if (isErrorResp(error)) {
      //errMessage = `${error.status} ${error.statusText}`;
    }
    setNetworklError({ error: true, message: errMessage });
    //setIsloading(false);
  }

  return (
    <Container>
      <Heading level={2} visualStyle={TypographyVisualStyle.headingLarge} css={undefined}>
        Welcome User: {userData.uid}
      </Heading>
      <Paragraph>Please choose a course:</Paragraph>
      <ul>
        {userData.courses.map((course: Enrollment) => {
          return (
            <li key={course.courseKey}>
              <Link href={buildHref(course)}>
                <a>{course.title}</a>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
};

export default ClassList;
