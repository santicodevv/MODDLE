import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class MoodleClientService {
  private readonly logger = new Logger(MoodleClientService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly moodleUrl: string;
  private readonly moodleToken: string;

  constructor(private readonly configService: ConfigService) {
    this.moodleUrl = this.configService.get<string>('MOODLE_URL') || '';
    this.moodleToken = this.configService.get<string>('MOODLE_TOKEN') || '';

    this.axiosInstance = axios.create({
      baseURL: `${this.moodleUrl}/webservice/rest`,
      timeout: 30000,
    });
  }

  async callFunction(wsfunction: string, params: any = {}): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/server.php', {
        params: {
          wstoken: this.moodleToken,
          wsfunction,
          moodlewsrestformat: 'json',
          ...params,
        },
      });

      if (response.data.exception) {
        throw new Error(`Moodle error: ${response.data.message}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error calling Moodle function ${wsfunction}: ${error.message}`,
      );
      throw error;
    }
  }

  // Obtener usuarios
  async getUsers(criteria: { key: string; value: string }[] = []): Promise<any[]> {
    // Si no hay criterios, obtener todos los usuarios con email no vacío
    const searchCriteria = criteria.length > 0
      ? criteria
      : [{ key: 'email', value: '%' }];

    const result = await this.callFunction('core_user_get_users', {
      criteria: searchCriteria,
    });

    return result.users || [];
  }

  // Obtener cursos
  async getCourses(): Promise<any[]> {
    return this.callFunction('core_course_get_courses');
  }

  // Obtener usuarios matriculados en un curso
  async getEnrolledUsers(courseid: number): Promise<any[]> {
    return this.callFunction('core_enrol_get_enrolled_users', { courseid });
  }

  // Obtener elementos de calificación de un curso
  async getGradeItems(courseid: number): Promise<any> {
    return this.callFunction('core_grades_get_grade_items', { courseid });
  }

  // Obtener calificaciones
  async getGrades(courseid: number, userids: number[] = []): Promise<any> {
    return this.callFunction('gradereport_user_get_grade_items', {
      courseid,
      userids,
    });
  }

  // Actualizar calificación
  async updateGrade(
    courseid: number,
    itemid: number,
    userid: number,
    grade: number,
    feedback?: string,
  ): Promise<any> {
    return this.callFunction('core_grades_update_grades', {
      source: 'mod/assign',
      courseid,
      component: 'mod_assign',
      activityid: itemid,
      itemnumber: 0,
      grades: [
        {
          studentid: userid,
          grade,
          str_feedback: feedback || '',
        },
      ],
    });
  }

  // Crear matrícula
  async enrolUser(
    courseid: number,
    userid: number,
    roleid: number = 5, // 5 = student role por defecto
  ): Promise<any> {
    return this.callFunction('enrol_manual_enrol_users', {
      enrolments: [
        {
          roleid,
          userid,
          courseid,
        },
      ],
    });
  }

  // Suspender matrícula
  async suspendEnrolment(courseid: number, userid: number): Promise<any> {
    return this.callFunction('enrol_manual_unenrol_users', {
      enrolments: [
        {
          userid,
          courseid,
        },
      ],
    });
  }
}
