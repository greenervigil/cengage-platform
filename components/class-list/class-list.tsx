import { Container, Heading, TypographyVisualStyle, Paragraph, Hyperlink } from 'react-magma-dom';
import Link from 'next/link';
import { Enrollment, AuthenticationResponse } from 'common-experience-client';

export interface ClassListProps {
  userData: AuthenticationResponse;
}

const ClassList: React.FC<ClassListProps> = ({ userData }) => {
  const buildHref = (course: Enrollment) => {
    return `/?token=${userData.token}&eISBN=${course.eisbn}&courseKey=${course.courseKey}`;
  };
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
